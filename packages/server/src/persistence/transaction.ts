import type { DatabaseSync } from 'node:sqlite';

export function createTransaction(db: DatabaseSync) {
  let transactionId = 0;

  return <T>(operation: () => T): T => {
    const savepoint = `operation_${++transactionId}`;
    db.exec(`SAVEPOINT ${savepoint}`);
    try {
      const result = operation();
      db.exec(`RELEASE ${savepoint}`);

      return result;
    } catch (error) {
      db.exec(`ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);

      throw error;
    }
  };
}
