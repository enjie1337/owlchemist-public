import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import fs from "fs";
var admin = require("firebase-admin");
const {
  getFirestore,
  Timestamp,
  FieldValue,
  add,
} = require("firebase-admin/firestore");
import { setTimeout } from "timers/promises";
import { Connection, clusterApiUrl, Keypair } from "@solana/web3.js";
import { NodeWallet, actions } from "@metaplex/js";

const base58 = require("bs58");
let connection = new Connection(clusterApiUrl("mainnet-beta"));

//1. arweave wallet

let wallet: JWKInterface = { ARWEAVE_PUBKEY };

//2. from ->0, 1, 2 NFTs
const fromI: number = 750;
const toI: number = 800;
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 33000,
  logging: false,
});

//file to tour firebase.json
//firestore database must be initialized in console
//3. firebase json

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
    //4. image folder

    const data = fs.readFileSync("./png/" + io + ".png");

    const transaction = await arweave.createTransaction({
      data: data,
    });

    transaction.addTag("Content-Type", "image/png");
    await arweave.transactions.sign(transaction, wallet);

    const response = await arweave.transactions.post(transaction);

    console.log(response);

    const imageUrl = transaction.id
      ? `https://arweave.net/${transaction.id}`
      : undefined;
    //const imageUrl= "https://arweave.net/mSCR3bIbo5i408MZIaZIRw1Bd3TI5HS9RPLfBqGGSmM"
    console.log(imageUrl);

    //read image
    //test

    // console.log(io+fromI);
    uploadJSON(imageUrl, io, transaction.id);
  }
}

async function uploadJSON(imageUrl, io, tx_id) {
  (async () => {
    //5. JSON files

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

    //1. arweave wallet

    await arweave.transactions.sign(metadataTransaction, wallet);

    console.log("https://arweave.net/" + metadataTransaction.id);

    let response = await arweave.transactions.post(metadataTransaction);
    console.log(response);

    await setTimeout(33000);
    mintNFT(
      "https://arweave.net/" + metadataTransaction.id,
      io,
      tx_id,
      imageUrl,
      metadataTransaction.id
    );
  })();
}
async function mintNFT(uriS, io, tx_id, imageUrl, metadataTransaction_id) {
  //let secretKey: Uint8Array= Uint8Array.from([]);
  let doc_id: String = "" + io;

  const mintNFTResponse = await actions.mintNFT({
    connection,
    //wallet: new NodeWallet(Keypair.fromSecretKey(secretKey)),
    wallet: new NodeWallet(
      Keypair.fromSecretKey(base58.decode("ARWEAVE SECRETKEY"))
    ),
    uri: uriS,
    maxSupply: 1,
  });

  mintNFTResponse.mint;
  mintNFTResponse.mint;
  console.log(mintNFTResponse.mint.toBase58());

  //SET THE COLLECTION NAME
  const docRef = db
    .collection("premint")
    .doc("collection")
    .collection("collection_name")
    .doc(doc_id); //.doc(doc_id);

  await docRef.set({
    image: io,
    image_id: tx_id,
    image_url: imageUrl,
    json_id: metadataTransaction_id,
    json_url: "https://arweave.net/" + metadataTransaction_id,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
    solsea: false,
    mint: mintNFTResponse.mint.toBase58(),
    mint_tx: mintNFTResponse.mint.toBase58(),
    magic_eden: false,
    collection: "Collection Name",
    minted: false,
    identifier: 1,
  });
}

readJSONsAndImages();
