import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('floralmedia.db');

export default db;