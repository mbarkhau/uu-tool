import json
import time
import shelve
import functools
import tempfile
import pathlib as pl


CACHE: dict = {}

cache_sizes = {}


def load_cache(filename):
    filepath = pl.Path(tempfile.gettempdir()) / filename

    done = False
    while not done:
        try:
            with shelve.open(filepath) as cache_db:
                CACHE.update(cache_db.items())
            done = True
        except PermissionError:
            time.sleep(0.5)

    # CACHE.clear()

    cache_sizes[filename] = len(CACHE)


def dump_cache(filename) -> None:
    # if cache_sizes[filename] == len(CACHE):
    #     return

    filepath = pl.Path(tempfile.gettempdir()) / filename

    done = False
    while not done:
        try:
            with shelve.open(filepath) as cache_db:
                for key, val in CACHE.items():
                    cache_db[key] = val
            done = True
        except PermissionError:
            time.sleep(0.5)
            print("cache dump fail")


def cache(func):
    @functools.wraps(func)
    def dec(*args, **kwargs):
        parts = []
        for arg in args:
            parts.append(str(arg))
        for key, val in kwargs.items():
            parts.append(key)
            parts.append(str(val))

        key = "-".join(parts)
        # if key in CACHE:
        #     if '"area_plz"' in CACHE[key]:
        #         CACHE.pop(key)

        if key not in CACHE:
            result = func(*args, **kwargs)
            CACHE[key] = json.dumps(result)
        return json.loads(CACHE[key])

    return dec
