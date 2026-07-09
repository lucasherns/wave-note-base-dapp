import type { Address } from "viem";

export const MAX_STATION_LENGTH = 40;
export const MAX_NOTE_LENGTH = 120;
export const TONES = ["Clear", "Warm", "Bright", "Deep"] as const;

export const waveNoteAbi = [
  {
    type: "event",
    name: "WaveSaved",
    inputs: [
      { name: "waveId", type: "uint256", indexed: true },
      { name: "maker", type: "address", indexed: true },
      { name: "station", type: "string", indexed: false },
      { name: "frequency", type: "uint8", indexed: false },
      { name: "tone", type: "string", indexed: false },
    ],
  },
  {
    type: "function",
    name: "saveWave",
    stateMutability: "nonpayable",
    inputs: [
      { name: "station", type: "string" },
      { name: "frequency", type: "uint8" },
      { name: "tone", type: "string" },
      { name: "note", type: "string" },
    ],
    outputs: [{ name: "waveId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getWave",
    stateMutability: "view",
    inputs: [{ name: "waveId", type: "uint256" }],
    outputs: [
      { name: "maker", type: "address" },
      { name: "station", type: "string" },
      { name: "frequency", type: "uint8" },
      { name: "tone", type: "string" },
      { name: "note", type: "string" },
      { name: "createdAt", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "nextWaveId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function isAddressLike(value?: string) {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

const configuredWaveNoteContractAddress =
  process.env.NEXT_PUBLIC_WAVE_NOTE_CONTRACT_ADDRESS?.trim();

export const waveNoteContractAddress = isAddressLike(configuredWaveNoteContractAddress)
  ? (configuredWaveNoteContractAddress as Address)
  : undefined;
