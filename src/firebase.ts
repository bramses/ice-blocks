var admin = require("firebase-admin");
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
var serviceAccount = require("./iceblocks-service-acct.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


export const addCodeBlock = async (db: any, code: string, language: string, title: string, urls: string[] = [], terminalCommand: string | null = null) => {
    
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

        if (!title) {
            return {
                error: "No title provided"
            };
        }
        
        let docRef;
        
        docRef = db.collection('codeblocks').doc(title);
        
    
        return docRef.set({
            code,
            language,
            title,
            urls,
            terminalCommand,
            createdAt: FieldValue.serverTimestamp()
        });
    } catch (err) {
        return {
            error: err
        };
    }
};

export const findCodeBlock = async (db: any, language: string) => {
    try {
        if (!language) {
            return {
                error: "No language provided"
            };
        }

        const codeBlocks: any[] = [];
        let docRef = db.collection('codeblocks').where('language', '==', language);
        return docRef.get()
        .then((querySnapshot: any) => {
            querySnapshot.forEach((doc: any) => {
                // doc.data() is never undefined for query doc snapshots
                console.log(doc.id, " => ", doc.data());
                codeBlocks.push(doc.data());
            });
            return codeBlocks;
        });
    } catch (err) {
        return {
            error: err
        };
    }
};
