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
let wallet: JWKInterface = {};

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

    await arweave.transactions.sign(metadataTransaction, {
      d: "EUCxj4qmGCF1Q-ephW8bJdSRBLKi7PiMLwzQnpRyLBaNdBkLFT72mVytYNAHKYszvA5swzldsuR_sRqQScVoNo9mTy1J0JMFT0Nm_yiJMubaIzjJojqHkeArH1a0vjcUvqfaUZnNiFHx0Ka8mPsV9pkJS5p1Yw5pyuQ5zpzAc9LmtMPcFoHUNcqUUvF68BxXG_FSBqFUlTNVw3hEWSL1pZqMoajTLurayrCPePpkdatovEZGqUXOBBd-XbBCq0iHAHXjN3QW5oAvYeLZ--RUua68QIqTZ5_poDqkS4zZKOggDWXKikfqqHrEjJaWdvPbYJZbCdwxWhap3EjukzYs6gUn-Su_5jCNrUeFlt08XjG75uuVrOTx74yjcG8ut2Yr43yrYfU74LHPoMBXO2_07sUdNTepbKgAME0gi84UzchEDkYp8IRS3n0L95To28jA5jAucJ_gFDw0pUZXP2lGP2RrAQJFNwwzu-HL2lc-wHCRKweBZPZ72anm-Ald3cm0fRKeQstvlvxaRQcQdC3nGX6xHUB-Su-a1lPf1WLJnQI3wcx7SXsYG1Y-xUcKWkCb33h1m_IxZuc0xFIIPKg4PlHXD-2xte2OWUdxoMNKlcFv5YFP_8z9hN1r0aEDzqifBNmvrMuk9zPXWcDy1dKys7RdKXIUikLBgEA1knI4cCk",
      dp: "GKgQPeq8SiEKcv95LyzgbFvv-oInsZ4mhXcdEVgCqhR-IhtE5IRBZkVmijk5wHPYXGtgVu1-4gE-4uuD5KIi1Zy0HXN5YBhN0aCCrWL1Ep6O_jZf_WhNgoDAPrXSvHSLeRG1wJzubKl-tKHGpC_mG8gUhCg9VM5-FEBGpaxLpdj03vvcQv6UtBdw76mDU6MKH9Cr5UUhv5gSouH-bML_tjplZG8wu8vzbQIsodF10KSbzgB71nweLSUQj9bXYeKTG5v87IyCe2rBIJmXzO6mPin8e3dj90bwvhKHLzs4q4a5q80qJ_vXleb9BfzB3QfzXKrz5nsrZ8y3U6kdWQvOhw",
      dq: "HO-xxVGaXIBDjyVWQ5Huk1wsHhTTsbq5t4WnSqXrFjI_caYBRpakI3qp8J0bP715ITYX0GUvoklWwCLPVvMbyJ12FJf49QIABii3WzUkJAJd4kor8H_MYRfIa7dAL6pcEUCxE62glSGQeg-P9ZeKRgl1RuzJI5h2mRHOeCsHzLC_zFe7JNZiDxMxFsbIzlmP1CaA71iDEz-ZPctNk6mwqv-O2Mm3coDeX7K-ohNzmp2ycuK6OKHM20Ojr1O2ej8yC0rEgAX1xvAyEqKbZ2mC74gKcWkmQ1YCIMAergwNjVv-ZUBAtUYbmqYvKTjGpFPPowbZvaSDJiyYgWZ5a-6uaQ",
      e: "AQAB",
      kty: "RSA",
      n: "miZrbxkC7ItfyA0Icw5dW77DszSVOUEhhqYMVXmoIzSmXJNBGcsnfAxhfvwOJ6kSKFnvGHhfFGyQIL8HGLv6Iq2g8wmh5tSdIorGrU2HJw5hclVl6XWlD80UQqe84d_I6rI9RHIG2EyT7pGU1_US8LaZYMW2-EellOyDvwiWg44IA_-cZ6dOaN7iANSu-uoFGv5byc-Zepra7ZuwDjcr0hOxRTClj-YX20LpQ2OxZ53xHv4c88QVtHTvUtehwD4QcCIxHipQA5kJma2PFfa84rL4inJndDtgKFrmojDRDKToE3gpms12A7_RWX3JHoy7pOYOLWobX1DLXgQ32MwbPGGVcrV5pSsAXhbbh0kuLJAnSLmAEBEATiSomTRd_5MrpEUNZp-LO9PLTNhDGU35ZUmZlKR-RLbwUYDLKKqs1WxFz3178xqz_A_GQ-BJziEezG8esbYyGzlhiQ5TWMfyHLfzm79G6WvQzXQXnlPuhF0v97Foy-u3DLdqY1XWCFnsziHL5Gk9sC-lrOYTo2rFnNs1sxflx2Y4_n-AYjh2OiExO3g8u7rVj67xSLhlCjOQtZ0yQmw6ODVWuAt7Jyx7nxMMpFeXwVQ-Factj1IZZAlY3Gqmr6nSLoLFzsHIDItvtuanpUQYTbb0DuWatStMpfKnfSBJGotifBcckmMcG-M",
      p: "55sOfhwKTjPnWCsCe28gE9OwP3tnDzixuM3ckoOT6KIKJiNCzulbo6OQ4gOYS_AIOoz_m4gCn51nlmpKMlesoGaB5TMka1lXggMFGK4oMuo6OMaoaIJv3eLSFBwV87fvLk_fNY8G2LMuMyqSnq0M3f5StmMMsnae-hsJy33dg8h5hYyKEQ5V4kjocpGhTbC8jgb1-x73_bfyBMsHLsLaEZ25lPRDxQY-7N5p5I7KsLliZMRL11f5lqqImcp5eiVjjVdPT6M1BGlmPKQ_fxSzYVotCaU0BFznoxGx6R58x7qfaMlKarNC4U9TSjhHsDmMJj6eDF4lwULbgVr_Fq5rBw",
      q: "qmLfxqrX44oNgs3AoWD5oq33ftlC5j-nXDgYS78taApvI1ETkH1fIm2EVJ8SMK-_Mv-EfxR4slNJf7DdZq-ynl3n2a6FPmaEB2CXtlEKSOytQgOMIwweYbYn6wP_-Z5JOdd64RpdcnSykgK27gB0-QwsuPmD5VsWh7bwRE0ZKBSHLatAvNOVN6Uarijul2Z_ARyXkoyLkF5_u6di1YYCxqQVuIay3Cv_dgU0sOD8yAu1fZDilxIFXFZGc3NeNfPculNxRk0j8rRxOsKK4T7wPtCeGHatWI9IhCs6hKPZZBbnO9E3GWlpCh2TJWXkDmizAyOrRqoiAtijWi-hecTlRQ",
      qi: "aiqRVlLi4OigEc6GzkUsaC87mRU8p5zmGbYgd71CwhVFSvN5s605LOiJd6QhEdYBtO1SY3Vo-jlaU928-rl51uWkZlzBNzKtK-qG84MLpHE9hCo7lA79KewpqWyBoLhSo1f08s_y5WJD9MwDC19pOteJPPB85YHk4TEkjtKZX-Muwaz0lRcbILExJBaGVPxeDAfgNhoNWHc-qxBH0ZSPyDJQSwu7RJ_5kr9H6oi2s5I9bFVzKMjaYPm0BTrFqG_TGgqW-7vbYd1sE8a5FrsNxszAB-Ld1vUmCs6bKvNg2XwucVyUQCfy6yVLj9ZnOOkkf7ZvVdtfsg2ur_Tr6UTZhw",
    });

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
