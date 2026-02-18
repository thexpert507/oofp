/**
 * Test Helpers - Saga Pattern
 *
 * Utilidades compartidas para los tests de Saga.
 */

export class TestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestError'
  }
}

export type TestUser = { id: string; recruiterId: number }
export type TestRecruiter = { id: number; email: string }
export type TestAuth = { uid: string; email: string }

export type TestContext = {
  db: {
    users: Map<string, TestUser>
    recruiters: Map<number, TestRecruiter>
  }
  firebase: Map<string, TestAuth>
  deletions: string[]
  log: string[]
}

export const createTestContext = (): TestContext => ({
  db: {
    users: new Map(),
    recruiters: new Map(),
  },
  firebase: new Map(),
  deletions: [],
  log: [],
})
