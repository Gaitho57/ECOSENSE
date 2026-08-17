import React from 'react';

export default function ModuleHeader({ icon, title, description }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex items-start gap-5">
      <div className="flex-shrink-0 w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl border border-blue-100">
        {icon}
      </div>
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{title}</h1>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-3xl">
          {description}
        </p>
      </div>
    </div>
  );
}
