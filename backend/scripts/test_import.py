import traceback
import importlib
try:
    importlib.import_module('main')
    print('imported main OK')
except Exception:
    traceback.print_exc()
