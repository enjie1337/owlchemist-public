var admin = require("firebase-admin");
const { getFirestore } = require('firebase-admin/firestore');
var serviceAccount = require("./firebase.json");
const fs = require('fs');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

async function getMints(){
    let content = ""
    const nftsRef = db.collection('premint').doc('collection').collection('collection_name');
    const snapshot = await nftsRef.get();
    if (snapshot.empty) {
      console.log('No matching documents.');
      return;
    }  
    
let docsSizeI = snapshot.size;
let counterI = 0

console.log("mints: "+docsSizeI)

    snapshot.forEach(doc => {
        if (counterI == 0){
            content+="[\n";
        }
      //console.log(doc.id, '=>', doc.data());
      if (counterI< docsSizeI-1){
        content+= `"${doc.data().mint}",\n`

      }else{
        content+= `"${doc.data().mint}"\n]`

      }
      counterI+=1;
    });


    fs.writeFile('mints.txt', content, err => {
        if (err) {
          console.error(err);
        }
        // file written successfully
      });
}

getMints()