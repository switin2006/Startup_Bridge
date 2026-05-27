// Creates a Notification row for a user and logs the action to the console.
// Usage: await createNotification(userId, 'interest_new', 'New Interest', 'body...', '/pitches/xxx')
import prisma from '../prisma.js'

export async function createNotification(userId, type, title, body, linkUrl) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      linkUrl,
    },
  })
  console.log(`[NOTIFY] ${type} → user ${userId}: ${title}`)
  return notification
}
