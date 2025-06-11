module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Add createdAt and updatedAt fields to tasks that don't have them
    const now = new Date();
    await db.collection('tasks').updateMany(
      { $or: [{ createdAt: { $exists: false } }, { updatedAt: { $exists: false } }] },
      {
        $set: {
          createdAt: now,
          updatedAt: now,
        },
      }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Remove createdAt and updatedAt fields from all tasks
    await db.collection('tasks').updateMany(
      {},
      {
        $unset: {
          createdAt: "",
          updatedAt: "",
        },
      }
    );
  }
};
