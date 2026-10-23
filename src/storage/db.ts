import { openDB, type IDBPDatabase } from 'idb'
let connection: Promise<IDBPDatabase> | undefined
export function database() {
  connection ??= openDB('branchcade-local', 1, {
    upgrade(db) {
      db.createObjectStore('app')
    },
    blocking() {
      void connection?.then((db) => db.close())
      connection = undefined
    },
    terminated() {
      connection = undefined
    },
  }).catch((error: unknown) => {
    connection = undefined
    throw error
  })
  return connection
}
