import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const apps = getApps();

const adminApp =
  apps.length > 0
    ? apps[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });

export const adminAuth = getAuth(adminApp);