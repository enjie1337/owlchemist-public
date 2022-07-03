import {
  WalletAdapterNetwork,
  WalletNotConnectedError,
} from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { Button } from "@solana/wallet-adapter-react-ui/lib/types/Button";
import {
  GlowWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import {
  clusterApiUrl,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import React, { FC, ReactNode, useMemo, useCallback, useState } from "react";
import TransmuteButton from "./Transmute";
require("./App.css");
require("@solana/wallet-adapter-react-ui/styles.css");
let thelamports = 0;
let theWallet = "ENTER_WALLET";
function getWallet() {}
const App: FC = () => {
  return (
    <Context>
      <Content />
    </Context>
  );
};

export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded.
  const wallets = useMemo(
    () => [
      new LedgerWalletAdapter(),
      new PhantomWalletAdapter(),
      new GlowWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolletExtensionWalletAdapter(),
      new SolletWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const Content: FC = () => {
  let [wallet, setWallet] = useState("ENTER_WALLET");

  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  let [nft, setNFT] = useState();

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();
    connection.getBalance(publicKey).then((bal) => {
      console.log(bal / LAMPORTS_PER_SOL);
    });

    let lamports = LAMPORTS_PER_SOL * 0.2;
    console.log(publicKey.toBase58());
    console.log("lamports sending: {}", thelamports);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(theWallet),
        lamports: lamports,
      })
    );

    const signature = await sendTransaction(transaction, connection);

    await connection.confirmTransaction(signature, "processed");
  }, [publicKey, sendTransaction, connection]);

  function checkState() {
    console.log(nft);
  }

  return (
    <div className="App">
      <h1>The Owlchemist has arrived!</h1>
      <p>
        Please select the NFTs you want to transmute. After Transmutation, you
        will need to accept a number of confirmations, dependant on the amount
        of NFTs you choose. This will send your NFTs to the Owlchemist's burn
        wallet and initiate the mint of your desired Founder's Shard. You will
        find the Shard in your wallet approximately 1 minute after
        transmutation.{" "}
      </p>
      <WalletMultiButton />

      <TransmuteButton />
    </div>
  );
};
