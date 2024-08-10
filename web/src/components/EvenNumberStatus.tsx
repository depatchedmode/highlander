'use client'

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const contractABI = [
  "function number() public view returns (uint256)",
  "function set(uint256 x, bytes calldata seal) public"
];

const useLocalNetwork = process.env.NEXT_PUBLIC_USE_LOCAL_NETWORK === 'true';

export default function EvenNumberStatus() {
  const [evenNumber, setEvenNumber] = useState<number | null>(null);
  const [newNumber, setNewNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvenNumber();
  }, []);

  async function fetchEvenNumber() {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      const result = await contract.number();
      setEvenNumber(Number(result));
    } catch (err) {
      console.error("Detailed error:", err);
      setError("Error fetching even number: " + (err as Error).message);
    }
  }

  async function handleSetEvenNumber(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const provider = getProvider();
      let signer;
      try {
        signer = await provider.getSigner();
        // Check if we can access the signer's address
        await signer.getAddress();
      } catch (signerError) {
        console.error("Signer error:", signerError);
        setError("Failed to get signer. Is MetaMask connected and unlocked?");
        return;
      }

      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      // Ensure the number is even
      const numberToSet = parseInt(newNumber);
      if (isNaN(numberToSet) || numberToSet % 2 !== 0) {
        throw new Error("Please enter a valid even number");
      }

      // TODO: Replace this with actual proof generation
      const seal = ethers.hexlify(ethers.randomBytes(32));

      console.log("Attempting to set number:", numberToSet);
      console.log("Seal:", seal);

      try {
        const tx = await contract.set(numberToSet, seal);
        console.log("Transaction sent:", tx.hash);
        setError("Transaction sent. Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);
        setError(null);
        setNewNumber('');
        await fetchEvenNumber();
      } catch (txError: any) {
        console.error("Transaction error:", txError);
        if (txError.code === 'ACTION_REJECTED') {
          setError("Transaction rejected by user");
        } else {
          setError(`Transaction failed: ${txError.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error("Detailed error:", err);
      if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError("An unknown error occurred");
      }
    }
  }

  function getProvider() {
    if (useLocalNetwork) {
      return new ethers.JsonRpcProvider("http://localhost:8545");
    } else {
      if (typeof window.ethereum === 'undefined') {
        throw new Error("Please install MetaMask!");
      }
      return new ethers.BrowserProvider(window.ethereum);
    }
  }

  return (
    <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
      <h2 className="mb-3 text-2xl font-semibold">Even Number Status</h2>
      {error ? (
        <p className="m-0 max-w-[30ch] text-sm opacity-50">Error: {error}</p>
      ) : evenNumber !== null ? (
        <p className="m-0 max-w-[30ch] text-sm opacity-50">Current even number: {evenNumber}</p>
      ) : (
        <p className="m-0 max-w-[30ch] text-sm opacity-50">Loading...</p>
      )}
      <form onSubmit={handleSetEvenNumber} className="mt-4">
        <input
          type="number"
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          placeholder="Enter an even number"
          className="mr-2 p-2 border rounded"
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded">Set Number</button>
      </form>
    </div>
  );
}