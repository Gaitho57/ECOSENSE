import sys
import django.contrib

class MockField:
    is_relation = False
    concrete = True
    many_to_many = False
    one_to_many = False
    one_to_one = False
    related_model = None
    remote_field = None
    model = None
    def __init__(self, *args, **kwargs):
        self.null = kwargs.get('null', False)
        self.blank = kwargs.get('blank', False)
        self.primary_key = kwargs.get('primary_key', False)
    def __call__(self, *args, **kwargs): return self
    def contribute_to_class(self, *args, **kwargs): pass
    def deconstruct(self): return ('MockField', [], {})
    def get_internal_type(self): return "CharField"

class MockModule:
    def __init__(self):
        self.fields = self
        self.models = self
        self.db = self
        self.geos = self
        self.gdal = self
        self.base = self
        self.proxy = self
        self.PointField = MockField
        self.PolygonField = MockField
    def __getattr__(self, name):
        return MockField

# Inject into sys.modules
mock_obj = MockModule()
sys.modules["django.contrib.gis"] = mock_obj
sys.modules["django.contrib.gis.db"] = mock_obj
sys.modules["django.contrib.gis.db.models"] = mock_obj
sys.modules["django.contrib.gis.db.models.fields"] = mock_obj
sys.modules["django.contrib.gis.geos"] = mock_obj
sys.modules["django.contrib.gis.gdal"] = mock_obj

# Inject into django.contrib
if not hasattr(django.contrib, "gis"):
    setattr(django.contrib, "gis", mock_obj)

import os
from django.core.management import execute_from_command_line

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.temp_settings")
    execute_from_command_line(sys.argv)
