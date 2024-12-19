"use client";
import Head from "next/head";
import { useEffect, useState } from "react";
import GradientBG from "../components/GradientBG.js";
import styles from "../styles/Home.module.css";
import { PublicKey, Mina, NetworkId, Poseidon, Field } from "o1js";

export default function Home() {
  const [nullifier, setNullifier] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    (async () => {
      const Network = Mina.Network({
        archive: "https://api.minascan.io/archive/devnet/v1/graphql",
        networkId: "testnet" as NetworkId,
        mina: "https://api.minascan.io/node/devnet/v1/graphql",
      });
      Mina.setActiveInstance(Network);
    })();
  }, []);
  const handleStepOne = async () => {
    let randomNullifier = Field.random(); // generate a random nullifier
    setNullifier(randomNullifier.toString());
    const publicKeyBase58: string = (
      await (window as any)?.mina?.requestAccounts()
    )[0]; // get the public key from the auro
    const publicKey = PublicKey.fromBase58(publicKeyBase58);
    let memo = Poseidon.hash([publicKey.x, randomNullifier])
      .toString()
      .substring(0, 32); // hash x coordinate of the public key and the nullifier then take the first 32 characters # max memo length is 32
    const result = await (window as any)?.mina?.sendPayment({
      amount: 0.00001,
      to: publicKeyBase58,
      memo: memo,
      fee: 0.1,
    }); // send a payment to the same wallet with the memo
    console.log(result.hash);
    setTxHash(result.hash);
    console.log("TX signed");
  };

  const handleStepTwo = async () => {
    console.log(txHash);
    try {
      const response = await fetch(
        `https://api.blockberry.one/mina-devnet/v1/transactions/${txHash}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-api-key": "MNwEtX0NzmYb61UDkoWGMT66g4JMHt",
          },
        }
      );// get the transaction data from the blockberry api

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Transaction data:", data);
      let is_valid =
        data.memo ===
        Poseidon.hash([
          PublicKey.fromBase58(data.sourceAddress).x,
          Field.from(nullifier),
        ])
          .toString()
          .substring(0, 32); // recompute the memo and compare it with the memo in the transaction
      console.log("signature is valid:", is_valid);
    } catch (error) {
      console.error("Error in handleStepTwo:", error);
    }
  };

  return (
    <>
      <Head>
        <title>Mina zkApp UI</title>
        <meta name="description" content="built with o1js" />
        <link rel="icon" href="/assets/favicon.ico" />
      </Head>
      <GradientBG>
        <main className={styles.main}>
          <div className={styles.grid}>
            <div className={styles.card} onClick={handleStepOne}> 
              <h2>Step One</h2>
              <button className={styles.button}>
                Send a tx in devnet
              </button>
            </div>
            <div className={styles.card} onClick={handleStepTwo}>
              <h2>Step Two</h2>
              <button className={styles.button}>
                Verify the tx
              </button>
            </div>
          </div>
        </main>
      </GradientBG>
    </>
  );
}
