import { DEMO_SCHEMA_VERSION, type DemoDatabase } from '@/data/database';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DemoStoreOptions {
  seedFactory: () => DemoDatabase;
  /** null desativa persistência (ex.: testes). */
  storage: StorageLike | null;
  storageKey?: string;
}

type Listener = () => void;

/**
 * Persistência simulada local. Mantém o banco em memória e grava em
 * localStorage a cada alteração. Substituível por APIs reais: apenas os
 * serviços conhecem a store.
 */
export class DemoStore {
  private db: DemoDatabase;
  private version = 0;
  private readonly listeners = new Set<Listener>();
  private readonly key: string;
  /** false quando o navegador bloqueia o armazenamento local. */
  persistenceAvailable = true;

  constructor(private readonly options: DemoStoreOptions) {
    this.key = options.storageKey ?? 'grs-demo-db';
    this.db = this.load();
  }

  private load(): DemoDatabase {
    const { storage } = this.options;
    if (storage) {
      try {
        const raw = storage.getItem(this.key);
        if (raw) {
          const parsed = JSON.parse(raw) as DemoDatabase;
          if (parsed?.meta?.schemaVersion === DEMO_SCHEMA_VERSION) return parsed;
        }
      } catch {
        this.persistenceAvailable = false;
      }
    }
    const seeded = this.options.seedFactory();
    this.persist(seeded);
    return seeded;
  }

  private persist(db: DemoDatabase): void {
    const { storage } = this.options;
    if (!storage) return;
    try {
      storage.setItem(this.key, JSON.stringify(db));
      this.persistenceAvailable = true;
    } catch {
      this.persistenceAvailable = false;
    }
  }

  private emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  /** Estado atual (somente leitura — alterações apenas via {@link mutate}). */
  getSnapshot(): Readonly<DemoDatabase> {
    return this.db;
  }

  getVersion(): number {
    return this.version;
  }

  /** Aplica uma alteração sobre uma cópia, persiste e notifica assinantes. */
  mutate<T>(mutator: (draft: DemoDatabase) => T): T {
    const draft = structuredClone(this.db);
    const result = mutator(draft);
    this.db = draft;
    this.persist(draft);
    this.emit();
    return result;
  }

  /** Restaura o cenário de demonstração original. */
  reset(): void {
    this.db = this.options.seedFactory();
    this.persist(this.db);
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
