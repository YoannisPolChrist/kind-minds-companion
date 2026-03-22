import test from "node:test";
import assert from "node:assert/strict";
import { createLanguageStore } from "../../../src/runtime/languageStore";

function createStorage(seed?: Record<string, string>) {
  const map = new Map(Object.entries(seed ?? {}));

  return {
    map,
    adapter: {
      async getItem(key: string) {
        return map.get(key) ?? null;
      },
      async setItem(key: string, value: string) {
        map.set(key, value);
      },
    },
  };
}

test("initLocale prefers explicit profile preferences over legacy, storage and detected locale", async () => {
  const storage = createStorage({ "user-language": "fr" });
  const store = createLanguageStore({
    storage: storage.adapter,
    detectLocale: () => "it",
  });

  await store.getState().initLocale("user-1", "en", "de");

  assert.equal(store.getState().locale, "en");
  assert.equal(storage.map.get("user-language"), "en");
});

test("initLocale falls back to legacy language when no nested preference exists", async () => {
  const storage = createStorage();
  const store = createLanguageStore({
    storage: storage.adapter,
    detectLocale: () => "it",
  });

  await store.getState().initLocale("user-1", null, "es");

  assert.equal(store.getState().locale, "es");
});

test("remote preference wins over storage and detected locale when profile has no language", async () => {
  const storage = createStorage({ "user-language": "fr" });
  const store = createLanguageStore({
    storage: storage.adapter,
    detectLocale: () => "it",
    fetchPreferredLanguage: async () => "en",
  });

  await store.getState().initLocale("user-1");

  assert.equal(store.getState().locale, "en");
});

test("stored locale wins over detected locale when no remote or profile preference exists", async () => {
  const storage = createStorage({ "user-language": "fr" });
  const store = createLanguageStore({
    storage: storage.adapter,
    detectLocale: () => "it",
  });

  await store.getState().initLocale("user-1");

  assert.equal(store.getState().locale, "fr");
});

test("detected locale is used for first-time users and falls back to default for unknown values", async () => {
  const firstStore = createLanguageStore({
    storage: createStorage().adapter,
    detectLocale: () => "it",
  });

  await firstStore.getState().initLocale("user-1");
  assert.equal(firstStore.getState().locale, "it");

  const fallbackStore = createLanguageStore({
    storage: createStorage().adapter,
    detectLocale: () => null,
  });

  await fallbackStore.getState().initLocale("user-2");
  assert.equal(fallbackStore.getState().locale, "de");
});

test("setLocale persists the manual override locally and remotely", async () => {
  const storage = createStorage();
  const remoteCalls: Array<{ userId?: string; locale: string }> = [];
  const store = createLanguageStore({
    storage: storage.adapter,
    persistPreferredLanguage: async (input) => {
      remoteCalls.push(input);
    },
  });

  await store.getState().setLocale("fr", "user-1");

  assert.equal(store.getState().locale, "fr");
  assert.equal(storage.map.get("user-language"), "fr");
  assert.deepEqual(remoteCalls, [{ userId: "user-1", locale: "fr" }]);
});
