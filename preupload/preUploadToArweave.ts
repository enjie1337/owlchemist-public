import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import fs from "fs";
var admin = require("firebase-admin");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");

//arweave wallet
let wallet: JWKInterface = {ARWEAVE_WALLET};

//from ->0, 1, 2 NFTs
const fromI: number = 690;
const toI: number = 849;
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 33000,
  logging: false,
});

//file to tour firebase.json
//firestore database must be initialized in console
var serviceAccount = require("./firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore();

async function readJSONsAndImages() {
  // Upload image to Arweave

  //iterate through images
  let throughI: number = toI - fromI;
  for (let io = fromI; io <= toI; io++) {
    const data = fs.readFileSync("./png/" + io + ".png");

    const transaction = await arweave.createTransaction({
      data: data,
    });

    transaction.addTag("Content-Type", "image/png");
    await arweave.transactions.sign(transaction, wallet);

    const response = await arweave.transactions.post(transaction);

    // console.log(response);

    const imageUrl = transaction.id
      ? `https://arweave.net/${transaction.id}`
      : undefined;

    console.log(imageUrl);

    // read image
    // test

    console.log(io + fromI);
    uploadJSON(imageUrl, io, transaction.id);
  }
}

async function uploadJSON(imageUrl, io, tx_id) {
  (async () => {
    // let jsonString = fs.readFileSync('./json/'+io+'.json');
    let metadata = fs.readFileSync("./json/" + io + ".json", "utf8").toString();

    //metadata = metadata.trim();

    // console.log(metadata);
    const metadataRequest: object = JSON.parse(metadata);
    metadataRequest["image"] = imageUrl;
    metadataRequest["properties"]["files"][0]["uri"] = imageUrl;
    metadata = JSON.stringify(metadataRequest);
    console.log(metadata);
    const metadataTransaction = await arweave.createTransaction({
      data: metadata,
    });

    metadataTransaction.addTag("Content-Type", "application/json");

    await arweave.transactions.sign(metadataTransaction, {ARWEAVE-WALLET});

    console.log("https://arweave.net/" + metadataTransaction.id);

    let response = await arweave.transactions.post(metadataTransaction);
    console.log(response);
    let doc_id: String = "" + io;
    const docRef = db.collection("nfts").doc(doc_id);

    await docRef.set({
      image: io,
      image_id: tx_id,
      image_url: imageUrl,
      minted: false,
      json_id: metadataTransaction.id,
      json_url: "https://arweave.net/" + metadataTransaction.id,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  })();
}

readJSONsAndImages();
