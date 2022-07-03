var serviceAccount = require("./firebase.json");
var admin = require("firebase-admin");
var bs58 = require("bs58");

const {
  getFirestore,
  Timestamp,
  FieldValue,
  serverTimestamp,
} = require("firebase-admin/firestore");
import { Keypair, PublicKey } from "@solana/web3.js";
const web3 = require("@solana/web3.js");

const spl = require("@solana/spl-token");

//KEYPAIR WALLET AND NETWORK
let keypair: Keypair = Keypair.fromSecretKey(
  bs58.decode("ENTER_YOUR_WALLET_KEY")
);
const connection = new web3.Connection(
  web3.clusterApiUrl("mainnet-beta"),
  "confirmed"
);

//let connection = new Connection(clusterApiUrl("mainnet-beta"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
let db = getFirestore();
// Listen for changes in all documents in the 'users' collection

const observer = db
  .collection("to_transmute")
  .where("sent", "==", false)
  .onSnapshot((querySnapshot) => {
    querySnapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        try {
          //GET [0-499 (RARE)], [500-749 (EPIC)], [750-749] (EPIC)]

          console.log("transmute_to added", change.doc.data());
          console.log("sending");
          getNFT(
            change.doc.data().shard,
            change.doc.data().publicKey,
            change.doc.id
          );
          //  console.log("uri"+ shard)
          console.log("sent");
        } catch (err) {
          console.log(err);
        }
      }
      if (change.type === "modified") {
        console.log("transmute_to modified", change.doc.data());
      }
      if (change.type === "removed") {
        console.log("transmute_to added Removed: ", change.doc.data());
      }
    });
  });

async function getNFT(shard: string, pk: PublicKey, doc_id) {
  let uriS = "";
  let doc2_id = "";
  //

  let premintRef = db
    .collection("premint")
    .doc("collection")
    .collection("collection_name");
  if (shard == "rare") {
    const snapshot = await premintRef
      .where("minted", "==", false)
      .where("image", "<=", 499)
      //.where('shard', '==', "rare")
      .get();
    if (snapshot.empty) {
      console.log("No matching documents.");
      return;
    }

    let loopedB = false;
    snapshot.forEach((doc) => {
      if (!loopedB) {
        loopedB = true;
        // console.log(doc.data().json_url)
        uriS = doc.data().json_url + "";
        console.log(doc.id, "=>", doc.data());
        doc2_id = doc.id;
      } else {
      }
    });
  }
  if (shard == "epic") {
    const snapshot = await premintRef
      .where("minted", "==", false)
      .where("image", ">=", 500)
      .where("image", "<=", 749)
      // .where('shard', '==', 'epic')
      .get();
    if (snapshot.empty) {
      console.log("No matching documents.");
      return;
    }

    let loopedB = false;
    snapshot.forEach((doc) => {
      if (!loopedB) {
        doc2_id = doc.id;

        loopedB = true;
        // console.log(doc.data().json_url)
        uriS = doc.data().json_url + "";
        console.log(doc.id, "=>", doc.data());
      } else {
      }
    });
  }
  if (shard == "legendary") {
    const snapshot = await premintRef
      .where("minted", "==", false)
      .where("image", ">=", 750)
      .where("image", "<=", 849)
      //.where('shard', '==', 'legendary')

      .get();
    if (snapshot.empty) {
      console.log("No matching documents.");
      return;
    }

    let loopedB = false;
    snapshot.forEach((doc) => {
      if (!loopedB) {
        doc2_id = doc.id;

        loopedB = true;
        // console.log(doc.data().json_url)
        uriS = doc.data().json_url + "";
        console.log(doc.id, "=>", doc.data());
      } else {
      }
    });
  }

  transferMintedNFT(uriS, pk, doc_id, doc2_id);
}

async function transferMintedNFT(uriS, publicKeyS, to_transmuteId, doc2_id) {
  //get transferMintedNFT
  let nftToSendRef = db
    .collection("premint")
    .doc("collection")
    .collection("collection_name")
    .doc(doc2_id);

  const doc = await nftToSendRef.get();
  if (!doc.exists) {
    console.log("No such document!");
  } else {
    console.log("Document data:", doc.data());
  }
  let theMint = new PublicKey(doc.data().mint);

  transferSpl(keypair, publicKeyS, theMint, to_transmuteId, doc2_id);
}

async function transferSpl(
  myKeypair: Keypair,
  toPublicKey: string,
  destMint: PublicKey,
  to_transmuteId: string,
  doc2_id: string
) {
  // Connect to cluster

  // connect to a previously generated wallet

  const fromWallet = myKeypair;

  // Generate a new wallet to receive newly minted token
  const walletTo = toPublicKey;
  const destPublicKey = new web3.PublicKey(walletTo);
  //const destMint: PublicKey = new web3.PublicKey(theMint);

  // Get the token account of the fromWallet address, and if it does not exist, create it
  const fromTokenAccount = await spl.getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    destMint,
    fromWallet.publicKey
  );

  // Get the token account of the toWallet address, and if it does not exist, create it
  const toTokenAccount = await spl.getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    destMint,
    destPublicKey
  );
  let signature = await spl.transfer(
    connection,
    fromWallet,
    fromTokenAccount.address,
    toTokenAccount.address,
    fromWallet.publicKey,
    1
  );

  // Create a document reference
  const docRef = db.collection("to_transmute").doc(to_transmuteId);

  // Update the timestamp field with the value from the server
  const res = await docRef.update({
    timestamp: FieldValue.serverTimestamp(),
    sent: true,
  });

  const docRef2 = db
    .collection("premint")
    .doc("collection")
    .collection("collection_name")
    .doc(doc2_id);

  // Update the timestamp field with the value from the server
  const res2 = await docRef2.update({
    updated_at: FieldValue.serverTimestamp(),
    minted: true,
    sent: true,
  });
}
