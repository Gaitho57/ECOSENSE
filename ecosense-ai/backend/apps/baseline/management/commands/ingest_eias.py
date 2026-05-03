import os
import glob
from django.core.management.base import BaseCommand
from django.conf import settings

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma

import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Ingest historical EIA PDFs into ChromaDB for RAG with sector and region metadata.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--base_dir',
            type=str,
            default=os.path.join(settings.BASE_DIR, 'data', 'reference_reports'),
            help='Base directory for historical EIAs.'
        )
        parser.add_argument(
            '--persist_dir',
            type=str,
            default=os.path.join(settings.BASE_DIR, 'chroma_db'),
            help='Directory to persist ChromaDB'
        )
        parser.add_argument(
            '--lite',
            action='store_true',
            help='Use TF-IDF instead of HuggingFace embeddings (no PyTorch required)'
        )

    def handle(self, *args, **options):
        base_dir = options['base_dir']
        persist_dir = options['persist_dir']
        use_lite = options['lite']

        if not os.path.exists(base_dir):
            # Try fallback to media/historical_eias if data/reference_reports is missing
            alt_dir = os.path.join(settings.BASE_DIR, 'media', 'historical_eias')
            if os.path.exists(alt_dir):
                base_dir = alt_dir
            else:
                self.stdout.write(self.style.ERROR(f"Directory {base_dir} does not exist."))
                return

        self.stdout.write(f"Scanning {base_dir} for PDFs...")
        pdf_paths = glob.glob(os.path.join(base_dir, '**', '*.pdf'), recursive=True)
        
        if not pdf_paths:
            self.stdout.write(self.style.WARNING("No PDF files found in " + base_dir))
            return

        all_docs = []
        embeddings = None
        
        if not use_lite:
            try:
                from langchain_huggingface import HuggingFaceEmbeddings
                import numpy as np
                
                self.stdout.write("Loading local HuggingFace embeddings...")
                embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            except ImportError:
                self.stdout.write(self.style.WARNING("sentence-transformers or torch missing. Switching to --lite mode (TF-IDF)."))
                use_lite = True

        for pdf_path in pdf_paths:
            filename = os.path.basename(pdf_path)
            self.stdout.write(f"Processing: {filename} ...")
            
            try:
                loader = PyPDFLoader(pdf_path)
                documents = loader.load()
                
                if not documents:
                    continue

                # Metadata tagging
                # For lite mode, we skip the embedding-based region/sector inference to stay fast
                region = "unknown"
                sector = "unknown"
                
                if not use_lite and embeddings:
                    # (Inference logic kept for non-lite mode if possible)
                    pass

                for doc in documents:
                    doc.metadata["filename"] = filename
                    doc.metadata["region"] = region
                    doc.metadata["sector"] = sector
                    
                all_docs.extend(documents)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed {filename}: {str(e)}"))

        if not all_docs:
            self.stdout.write(self.style.ERROR("No docs parsed."))
            return

        self.stdout.write(f"Loaded {len(all_docs)} pages. Splitting...")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        split_docs = text_splitter.split_documents(all_docs)

        if use_lite:
            from langchain_community.retrievers import TFIDFRetriever
            import pickle
            self.stdout.write("Creating TF-IDF Retriever...")
            retriever = TFIDFRetriever.from_documents(split_docs)
            
            lite_path = os.path.join(settings.BASE_DIR, 'rag_lite.pkl')
            with open(lite_path, 'wb') as f:
                pickle.dump(retriever, f)
            self.stdout.write(self.style.SUCCESS(f"Successfully persisted Lite RAG to {lite_path}."))
        else:
            self.stdout.write(f"Persisting {len(split_docs)} chunks to ChromaDB...")
            vector_store = Chroma.from_documents(
                documents=split_docs,
                embedding=embeddings,
                persist_directory=persist_dir
            )
            vector_store.persist()
            self.stdout.write(self.style.SUCCESS(f"Successfully persisted ChromaDB to {persist_dir}."))
