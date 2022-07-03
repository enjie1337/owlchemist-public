import db from "./firebase";
import {
  getDocs,
  getDoc,
  query,
  where,
  addDoc,
  collection,
  DocumentData,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, {
  FC,
  ReactNode,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from "react";
import { Connection } from "@metaplex/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletAdapterNetwork,
  WalletNotConnectedError,
} from "@solana/wallet-adapter-base";
import {
  clusterApiUrl,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
} from "@solana/web3.js";
import validNftsA from "./hashlist.json";
import { getOrCreateAssociatedTokenAccount } from "./getOrCreateAssociatedTokenAccount";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import "./Transmute.css";
import "./components/NFTS/NFTContainer.css";
import "./components/NFTS/singleNFT.css";
import "./components/Shards/ShardContainer.css";
import "./components/Shards/ShardForm.css";

import { createTransferInstruction } from "./createTransferInstructions";
import { get } from "https";
import { ifError } from "assert";
import { setUserId } from "firebase/analytics";
import { createAssociatedTokenAccountInstruction } from "./createAssociatedTokenAccountInstruction";
// interface Props {
//   children: (sendTransaction: OnSendTransaction) => React.ReactNode
// }
// type OnSendTransaction = (toPublicKey: string, amount: number) => void
require("./App.css");

const TransmuteButton: FC = () => {
  let [nfts, setNfts] = useState<string[]>([]);
  const q = query(collection(db, "nfts"), where("minted", "==", false));
  let [validNftsChecked, setValidNftsChecked] = useState<string[]>([]);
  let [isInit, setIsInit] = useState(true);
  let [notMinted, setNotMinted] = useState<DocumentData>([]);
  let [checked, setChecked] = useState(false);
  const [uid, setUid] = useState("");

  //NFT's Business to Shard
  let [rareI] = useState(2);
  let [epicI] = useState(10);
  let [isLegendary, setIsLegendary] = useState(false);
  let [legendaryCurrentTxI, setLegendaryCurrentTxI] = useState(0);
  let [legendaryI, setLegendaryI] = useState(30 / 3);
  let [legendaryFixedI] = useState(30);
  let [shardO, setShardO] = useState({
    rare: rareI,
    epic: epicI,
    legendary: legendaryI,
  });
  let [isValidTransmuteS, setIsValidTransmuteS] = useState("");
  let [isValidTransmuteB, setIsValidTransmuteB] = useState(false);
  let [currentTransaction, setCurrentTransaction] = useState(0);
  let [legendaryDocId, setLegendaryDocId] = useState("");
  let [rarity, setRarity] = useState();
  let [shard, setShard] = useState("rare");
  let [pk, setPk] = "";
  let [transmutedS, setTransmutedS] = useState("Transmuted...");
  let [loading, setLoading] = useState("Loading... Wait");
  function getIfValidTransmute() {
    console.log(
      "init checker get if valid shard: " +
        shard +
        " valid NFTs: " +
        validNftsChecked.length
    );
    switch (shard) {
      case "rare":
        validNftsChecked.length == rareI
          ? (isValidTransmuteB = true)
          : (isValidTransmuteB = false);
        setIsValidTransmuteB(isValidTransmuteB);
        break;
      case "epic":
        validNftsChecked.length == epicI
          ? (isValidTransmuteB = true)
          : (isValidTransmuteB = false);
        setIsValidTransmuteB(isValidTransmuteB);

        break;
      case "legendary":
        validNftsChecked.length == legendaryI
          ? (isValidTransmuteB = true)
          : (isValidTransmuteB = false);
        setIsValidTransmuteB(isValidTransmuteB);

        break;
      default:
        isValidTransmuteB = false;
        setIsValidTransmuteB(isValidTransmuteB);
        break;
    }
    if (isValidTransmuteB) {
      setIsValidTransmuteS("Transmute is Valid ✅");
      console.log("transmite is Valid");
    } else {
      setIsValidTransmuteS(
        "You have: " +
          validNftsChecked.length +
          " and need: " +
          shardO["" + shard]
      );
      console.log("valid Transmute");
    }
  }
  useEffect(() => {
    const getNFTs = async () => {
      const auth = getAuth();

      const data = await getDocs(q);
      setNotMinted(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      // get NFTS that has the user and are valid

      signInAnonymously(auth)
        .then(() => {
          // Signed in..
          console.log("signedIn");

          getCurrentTx();
          getTransmuted();
          let current_transaction: number = currentTransaction;
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          // ...
        });

      //save UID
      onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in, see docs for a list of available properties
          // https://firebase.google.com/docs/reference/js/firebase.User
          const uid = user.uid;
          setUid(uid);
          // ...
        } else {
          // User is signed out
          // ...
        }
      });
    };

    getNFTs();
  }, []);

  let amount = 0.00001; // minting price
  let lamportsCost = 0.001 * LAMPORTS_PER_SOL;
  let targetWallet = "ENTER_WALLET";
  let [nft, setNFT] = useState();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  let mintsValid: any = [];

  const btnClickHandler = () => {
    getNFTAddressInWallet();
  };

  async function getNFTAddressInWallet() {
    if (!publicKey) throw new WalletNotConnectedError();
    connection.getBalance(publicKey).then((bal) => {
      console.log(bal / LAMPORTS_PER_SOL);
    });

    let publicKeyString = publicKey;
    let validNftsArray = JSON.parse(JSON.stringify(validNftsA));
    (async () => {
      const connection = new Connection("mainnet-beta");
      const ownerPublickey = nft;
      const nftsmetadata = await Metadata.findDataByOwner(
        connection,
        publicKeyString
      );

      console.log(nftsmetadata);

      let counter: number = nftsmetadata.length;
      console.log("counter: " + counter);

      let counterI = 0;
      let fieldset = (
        <fieldset>
          {" "}
          <legend>Select a NFT for exchange:</legend>
        </fieldset>
      );
      let nftsThatAreValid: string[] = [];
      for (var i in nftsmetadata) {
        //console.log(nftsmetadata[i].mint);

        for (var ao in validNftsArray) {
          if (nftsmetadata[i].mint == validNftsArray[ao]) {
            console.log("✅" + nftsmetadata[i].mint);
            nftsThatAreValid.push(nftsmetadata[i].mint + "");
          }
        }

        counterI += 1;
      }
      //  setNfts(nftsThatAreValid);
      //  setNfts(nfts.map(nftsThatAreValid=>nftsThatAreValid);
      //setNotMinted(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      setNfts(nftsThatAreValid);

      console.log(nfts);

      const toPublicKey = new PublicKey(publicKey);
      const mint = new PublicKey([0]);

      //onSendSPLTransaction()
    })();
  }

  async function getIfValidNfts() {
    console.log("isLegendary: " + isLegendary);
    getTransmuted();
    const connection = new Connection("mainnet-beta");
    if (!publicKey) throw new WalletNotConnectedError();
    connection.getBalance(publicKey).then((bal) => {
      console.log(bal / LAMPORTS_PER_SOL);
    });

    let publicKeyString = publicKey;
    let validNftsArray = JSON.parse(JSON.stringify(validNftsA));
    const ownerPublickey = nft;
    const nftsmetadata = await Metadata.findDataByOwner(
      connection,
      publicKeyString
    );

    console.log(nftsmetadata);

    let counter: number = nftsmetadata.length;
    console.log("counter: " + counter);

    let counterI = 0;
    let nftsThatAreValid: string[] = [];
    for (var i in nftsmetadata) {
      //console.log(nftsmetadata[i].mint);

      for (var ao in validNftsArray) {
        if (nftsmetadata[i].mint == validNftsArray[ao]) {
          console.log("✅" + nftsmetadata[i].mint);
          nftsThatAreValid.push(nftsmetadata[i].mint + "");
        }
      }

      counterI += 1;
    }
    //  setNfts(nftsThatAreValid);
    //  setNfts(nfts.map(nftsThatAreValid=>nftsThatAreValid);
    //setNotMinted(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    console.log("nfts" + nfts);
    setNfts(nftsThatAreValid);

    const toPublicKey = new PublicKey(publicKey);
    const mint = new PublicKey([0]);

    //onSendSPLTransaction()
  }
  //getNFTAddressInWallet();

  function preOnSendSPLTransaction() {
    console.log("validNFTsChecked{}", validNftsChecked);

    if (shard == "") {
      return;
    } else {
      console.log("shard: ", shard);
    }
    onSendSPLTransaction(shard, uid);
  }
  const onSendSPLTransaction = useCallback(
    async (shard, uid) => {
      let theShard = shard;
      console.log("theShard", theShard);

      if (validNftsChecked.length == 0) {
        console.log("no nfts selected");
      } else {
        if (!publicKey || !signTransaction) throw new WalletNotConnectedError();
        getTransmuted();
        //PROJECT TARGET WALLET
        const toPublicKey = new PublicKey("ENTER_WALLET");
        const transaction = new Transaction();

        try {
          if (shard == "epic" || shard == "rare") {
            for (let io = 0; io < validNftsChecked.length; io++) {
              setLoading("Aprove all Transactions");
              //start validNftsChecked to instruction
              const mint = new PublicKey(validNftsChecked[io]);
              console.log("mint" + mint);
              const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                publicKey,
                mint,
                publicKey,
                signTransaction
              );
              const toTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                publicKey,
                mint,
                toPublicKey,
                signTransaction
              );
              transaction.add(
                createTransferInstruction(
                  fromTokenAccount.address, // source
                  toTokenAccount.address, // dest
                  publicKey,
                  1,
                  [],
                  TOKEN_PROGRAM_ID
                )
              );
              //end
            }

            // const mint = new PublicKey(mintsValid[0])

            // Get the token account of the toWallet address, and if it does not exist, create it

            const blockHash = await connection.getRecentBlockhash();
            transaction.feePayer = await publicKey;
            transaction.recentBlockhash = await blockHash.blockhash;
            const signed = await signTransaction(transaction);

            await connection.sendRawTransaction(signed.serialize());
            // const signature = await sendTransaction(transaction, connection);

            //SAVE ON FIRESTORE transactions_transmute

            // User is signed in, see docs for a list of available properties
            // https://firebase.google.com/docs/reference/js/firebase.User
            console.log(uid);
            // ...

            await setToTransmute(theShard, publicKey);

            setTimeout(function () {
              window.location.reload();
            }, 1500);

            //   await connection.confirmTransaction(signature, 'processed');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } else if (shard == "legendary") {
            await getCurrentTx();
            console.log("eureka");

            //START LEGENDARY

            // let range1 = [0,1,2,3,4,5,6,7,8]
            // let range2 = [9,10,11,12,13,14,15,16,17]
            // let range3 = [18,19,20,21,22,23,24,25,26]

            //RANGES of 3 TX NFT indexed 3 txs of 10 NFT transfers
            let range1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            let range2 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
            let range3 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

            let theRange = range1;
            if (currentTransaction == 1) {
              theRange = range2;
            } else if (currentTransaction == 2) {
              theRange = range3;
            }

            let nftsSent: string[] = [];

            try {
            } catch (err) {}
            for (let io = 0; io < theRange.length; io++) {
              setLoading("Aprove all Transactions");

              //start validNftsChecked to instruction
              let currentNumberNFT = theRange[io];
              nftsSent.push(validNftsChecked[io]);

              const mint = new PublicKey(validNftsChecked[io]);
              console.log("mint" + mint);
              const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                publicKey,
                mint,
                publicKey,
                signTransaction
              );
              const toTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                publicKey,
                mint,
                toPublicKey,
                signTransaction
              );
              transaction.add(
                createTransferInstruction(
                  fromTokenAccount.address, // source
                  toTokenAccount.address, // dest
                  publicKey,
                  1,
                  [],
                  TOKEN_PROGRAM_ID
                )
              );
              //end
            }

            // const mint = new PublicKey(mintsValid[0])

            // Get the token account of the toWallet address, and if it does not exist, create it

            const blockHash = await connection.getRecentBlockhash();
            transaction.feePayer = await publicKey;
            transaction.recentBlockhash = await blockHash.blockhash;
            const signed = await signTransaction(transaction);

            await connection.sendRawTransaction(signed.serialize());
            // const signature = await sendTransaction(transaction, connection);

            //SAVE ON FIRESTORE transactions_transmute

            // User is signed in, see docs for a list of available properties
            // https://firebase.google.com/docs/reference/js/firebase.User
            const q = query(
              collection(db, "to_transmute_legendary"),
              where("sent", "==", false)
            );
            const querySnapshot = await getDocs(q);

            let ldocId = "";
            await querySnapshot.forEach((doc) => {
              ldocId = doc.id;
            });
            console.log("ldocId: " + ldocId);
            if (ldocId == "") {
              //add doc

              console.log(uid);
              const docData = {
                sent: false,
                uid: uid,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                nfts: validNftsChecked,
                shard: theShard,
                current_transaction: 1,
                ["0"]: validNftsChecked,
                publicKey: publicKey.toBase58(),
              };
              // await setDoc(doc(db, "to_transmute", uid), docData);

              // Add a new document with a generated id.
              const docRef = await addDoc(
                collection(db, "to_transmute_legendary"),
                docData
              );
            } else {
              //update doc
              let isSentB = false;
              if (currentTransaction >= 2) {
                isSentB = true;

                setToTransmute(theShard, publicKey);
              }
              const updateRef = doc(db, "to_transmute_legendary", ldocId);
              // Atomically increment the population of the city by 50.
              await updateDoc(updateRef, {
                updated_at: serverTimestamp(),
                sent: isSentB,
                current_transaction: currentTransaction + 1,
                nfts: validNftsChecked,
                [currentTransaction]: nftsSent,
              });
            }

            setLoading(
              "Wait processing Transaction: " + currentTransaction + "/3"
            );
            //END LEGENDARY
            setTimeout(function () {
              window.location.reload();
            }, 6000);
          }
        } catch (error: any) {
          console.log(error);
        }
      }
    },
    [publicKey, sendTransaction, connection]
  );

  function selectHandler() {}
  async function setToTransmute(theShard, publicKey) {
    console.log(uid);
    const docData = {
      sent: false,
      uid: uid,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      nfts: validNftsChecked,
      shard: theShard,
      publicKey: publicKey.toBase58(),
    };
    // await setDoc(doc(db, "to_transmute", uid), docData);

    // Add a new document with a generated id.
    const docRef = await addDoc(collection(db, "to_transmute"), docData);
  }

  async function getCurrentTx() {
    const q = query(
      collection(db, "to_transmute_legendary"),
      where("sent", "==", false)
    );
    const querySnapshot = await getDocs(q);

    await querySnapshot.forEach((doc) => {
      legendaryDocId = doc.id;
      setLegendaryDocId(legendaryDocId);
      console.log("current tx:", doc.data().current_transaction);
      currentTransaction = doc.data().current_transaction;
      setCurrentTransaction(currentTransaction);
      legendaryCurrentTxI = currentTransaction;
      setLegendaryCurrentTxI(legendaryCurrentTxI);
      //legendaryI = legendaryFixedI - ((legendaryFixedI/3)*(currentTransaction))
      legendaryI = legendaryFixedI / 3;
      setLegendaryI(legendaryI);
      isLegendary = true;
      setIsLegendary(isLegendary);
      console.log("legendary: " + legendaryI);
      console.log((legendaryFixedI / 3) * currentTransaction);
      setShardO({ rare: rareI, epic: epicI, legendary: legendaryI });

      if (isLegendary) {
        isInit = false;
        setIsInit(isInit);
        setShardAndCheck("legendary");
      }
    });
    loading = "Ready (Connect Wallet and click on Get My NFTs)!";
    setLoading(loading);
  }

  function setCheckedNFT(er, checkedB) {
    console.log(er);
    if (checkedB) {
      let nftIdexedB = false;

      console.log("checked");

      validNftsChecked.push(er);
      setValidNftsChecked(validNftsChecked);
    } else {
      let indexI = validNftsChecked.indexOf(er);

      console.log("unchecked", indexI);

      validNftsChecked.splice(indexI, 1);
      setValidNftsChecked(validNftsChecked);
    }

    getIfValidTransmute();
  }

  function setShardAndCheck(shardS) {
    if (shardS != "rare") {
      isInit = false;
    } else {
      isInit = true;
    }
    setIsInit(isInit);

    shard = shardS;
    console.log("set Shard: " + shard);
    setShard(shard);
    getIfValidTransmute();
    if (shard == "legendary") {
      setIsLegendary(true);
    } else {
      setIsLegendary(false);
    }
  }

  async function getTransmuted() {
    if (publicKey != null) {
      const q = query(
        collection(db, "to_transmute"),
        where("publicKey", "==", publicKey.toBase58())
      );

      const querySnapshot = await getDocs(q);
      let counterShardsI: number = 0;
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
        counterShardsI += 1;
      });
      transmutedS = "Transmuted: " + counterShardsI + " Shards!";
      setTransmutedS(transmutedS);
    } else {
      console.log("publicKey");
    }
  }

  return (
    <div>
      <br></br>
      <div>
        <h3>Select NFTs to transmute: </h3>
        <div className="messageTransmute" key="loading">
          {loading}
        </div>
        <div className="messageTransmute" key="transmuted">
          {transmutedS}
        </div>

        <div className="nftContainer">
          {nfts.map((nfts) => (
            <span key={"span" + nfts} className="singleType">
              {nfts}
              <input
                type="checkbox"
                key={nfts}
                value={nfts}
                //type={nfts.attributes[1].value}
                //id={nfts.name.split("#").pop()}
                //img={nfts.image}
                onChange={(e) =>
                  setCheckedNFT(e.target.value, e.target.checked)
                }
              />
            </span>
          ))}
        </div>
      </div>
      <button onClick={getIfValidNfts} className="btnTransmute">
        GET MY NFTS
      </button>
      <div>
        <h3>Select Shard recipe: {rarity} </h3>
        <div className="shardContainer">
          <div className={!isLegendary ? "hidden" : "messageTransmute"}>
            Legendary Transaction {legendaryCurrentTxI}/3
          </div>

          <div className="messageTransmute">{isValidTransmuteS}</div>
          <br></br>
          <form onChange={selectHandler}>
            <label className="transmuteOption">
              <img className="shardImage" src="./img/rare.png" alt=""></img>
              <input
                checked={isInit}
                onChange={(e) => setShardAndCheck("rare")}
                type="radio"
                value="Rare"
                name="shard"
              />
              Rare: Transmute 2 NFTs into 1 Rare Founder's Shard
            </label>
            <label className="transmuteOption">
              <img className="shardImage" src="./img/epic.png" alt=""></img>
              <input
                type="radio"
                value="Epic"
                name="shard"
                onChange={(e) => setShardAndCheck("epic")}
              />
              Epic: Transmute 10 NFTs into 1 Rare Founder's Shard
            </label>
            <label className="transmuteOption">
              <img
                className="shardImage"
                src="./img/legendary.png"
                alt=""
              ></img>
              <input
                checked={isLegendary}
                type="radio"
                value="Legendary"
                name="shard"
                onChange={(e) => setShardAndCheck("legendary")}
              />
              Legendary: Transmute 30 NFTs into 1 Legendary Founder's Shard
            </label>
          </form>
        </div>
      </div>
      <br />
      <button
        disabled={!isValidTransmuteB}
        onClick={preOnSendSPLTransaction}
        className="btnTransmute"
      >
        TRANSMUTE
      </button>

      <div id="validNFTs"></div>
    </div>
  );
};

export default TransmuteButton;
