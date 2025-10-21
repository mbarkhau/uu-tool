#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [ ]
# ///
import sys
import json
import time
import shelve
import tempfile
import typing as typ
import pathlib as pl
import functools as ft
import hashlib as hl
import contextlib

CachedDict = dict[str, typ.Any]

_CACHE_BY_FILENAME: dict[str, CachedDict] = {}

cache_sizes: dict[str, int] = {}


def _cache_filepath(filename: str) -> pl.Path:
    return pl.Path(tempfile.gettempdir()) / filename


def load_cache(filename: str) -> CachedDict:
    """
    returns: CachedDict by reference. Mutated dict is persisted by calling dump_cache(filename).
    """
    fpath = _cache_filepath(filename)

    # NOTE: Read from cache file can fail if written to concurrently.
    #       Retry until successful.
    # TODO: Semaphore?
    if fpath.exists():
        done = False
        while not done:
            try:
                with shelve.open(fpath, flag="r") as cache_db:
                    _CACHE_BY_FILENAME[filename] = dict(cache_db.items())
                done = True
            except PermissionError:
                time.sleep(0.5)
    else:
        _CACHE_BY_FILENAME[filename] = {}

    cache_sizes[filename] = len(_CACHE_BY_FILENAME[filename])
    return _CACHE_BY_FILENAME[filename]


def dump_cache(filename: str, cache: CachedDict | None) -> None:
    # if cache_sizes[filename] == len(_CACHE_BY_FILENAME):
    #     return

    fpath = _cache_filepath(filename)
    if cache is None:
        cache = _CACHE_BY_FILENAME[filename]

    # TODO: Semaphore? eventually consistent?
    done = False
    while not done:
        try:
            with shelve.open(fpath, flag="c") as cache_db:
                for key, val in cache.items():
                    cache_db[key] = val
            done = True
        except PermissionError:
            time.sleep(0.5)
            print("cache dump fail")


@contextlib.contextmanager
def cache_ctx(filename: str) -> typ.Generator[CachedDict, None, None]:
    cache = load_cache(filename)
    yield cache
    dump_cache(filename)


def cache(func: typ.Callable):
    fname_txt = __file__ + "::" + func.__name__
    filename = hl.sha1(fname_txt.encode("ascii")).hexdigest()

    @ft.wraps(func)
    def dec(*args, **kwargs) -> typ.Any:
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

        cache = load_cache(filename)
        if key not in cache:
            result = func(*args, **kwargs)
            cache[key] = json.dumps(result)
            dump_cache(filename, cache)
        return json.loads(cache[key])

    return dec


def _main(args: list[str]) -> int:
    fname = "test_cache.db"
    with cache_ctx(fname) as cache:
        cache["test1"] = 123
        cache["test2"] = 345

    assert load_cache(fname) == {"test1": 123, "test2": 345}
    # TODO: actually test cache logic

    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
