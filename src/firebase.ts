var admin = require("firebase-admin");
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
var serviceAccount = require("./iceblocks-service-acct.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export const db = getFirestore();

export const addCodeBlock = async (code: string, language: string, title = "Untitled", urls: string[] = []) => {
    
    try {
        if (!code) {
            return {
                error: "No code provided"
            };
        }
    
        if (!language) {
            return {
                error: "No language provided"
            };
        }
        
        let docRef;
        
        if (title) {docRef = db.collection('codeblocks').doc(title);}
        else {docRef = db.collection('codeblocks').doc();}
    
        return docRef.set({
            code,
            language,
            title,
            urls,
            createdAt: FieldValue.serverTimestamp()
        });
    } catch (err) {
        return {
            error: err
        };
    }
};
