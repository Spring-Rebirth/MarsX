import { databases, config } from "../lib/appwrite";

export async function updateUserInfo(userId, content = {}) {
  try {
    const updateUserInfo = await databases.updateDocument(
      config.databaseId,
      config.usersCollectionId,
      userId,
      content
    );
    return updateUserInfo;
  } catch (error) {
    console.warn('updateUserInfo failed:', error.message);
  }
}