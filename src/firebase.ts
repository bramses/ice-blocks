var admin = require("firebase-admin");
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
var serviceAccount = require("./iceblocks-service-acct.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


export const addCodeBlock = async (db: any, code: string, language: string, title: string, urls: string[] = [], terminalCommand: string | null = null) => {
    console.log(`Adding code block: ${title}`);
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
            createdAt: FieldValue.serverTimestamp(),
            priority: 0
        });
    } catch (err) {
        return {
            error: err
        };
    }
};

export const incrementPriority = async (db: any, id: string) => {
    console.log(`Incrementing priority for code block: ${id}`);
    try {
        const docRef = db.collection('codeblocks').doc(id);
        const doc = await docRef.get();
        const priority = doc.data().priority;
        return docRef.update({
            priority: priority + 1
        });
    } catch (err) {
        return {
            error: err
        };
    }
};

export const findCodeBlock = async (db: any, language: string) => {
    console.log(`Finding code blocks for: ${language}`);
    try {
        if (!language) {
            return {
                error: "No language provided"
            };
        }

        console.log(`findCodeBlock: ${language}`);

        const codeBlocks: any[] = [];
        let docRef = db.collection('codeblocks').where('language', '==', language);
        return docRef.get()
        .then((querySnapshot: any) => {
            querySnapshot.forEach((doc: any) => {
                // doc.data() is never undefined for query doc snapshots
                console.log(doc.id, " => ", doc.data());
                const data = doc.data();
                data.id = doc.id;
                codeBlocks.push(data);
            });
            return codeBlocks.sort((a: any, b: any) => {
                return b.priority - a.priority;
            });
        });
    } catch (err) {
        return {
            error: err
        };
    }
};
