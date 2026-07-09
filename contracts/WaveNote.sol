// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WaveNote {
    uint256 public nextWaveId = 1;

    struct Wave {
        address maker;
        string station;
        uint8 frequency;
        string tone;
        string note;
        uint256 createdAt;
    }

    mapping(uint256 => Wave) private waves;

    event WaveSaved(
        uint256 indexed waveId,
        address indexed maker,
        string station,
        uint8 frequency,
        string tone
    );

    function saveWave(
        string calldata station,
        uint8 frequency,
        string calldata tone,
        string calldata note
    ) external returns (uint256 waveId) {
        require(bytes(station).length > 0 && bytes(station).length <= 40, "Invalid station");
        require(frequency >= 1 && frequency <= 99, "Invalid frequency");
        require(bytes(tone).length > 0 && bytes(tone).length <= 16, "Invalid tone");
        require(bytes(note).length > 0 && bytes(note).length <= 120, "Invalid note");

        waveId = nextWaveId++;
        waves[waveId] = Wave({
            maker: msg.sender,
            station: station,
            frequency: frequency,
            tone: tone,
            note: note,
            createdAt: block.timestamp
        });

        emit WaveSaved(waveId, msg.sender, station, frequency, tone);
    }

    function getWave(
        uint256 waveId
    )
        external
        view
        returns (
            address maker,
            string memory station,
            uint8 frequency,
            string memory tone,
            string memory note,
            uint256 createdAt
        )
    {
        Wave storage entry = waves[waveId];
        return (
            entry.maker,
            entry.station,
            entry.frequency,
            entry.tone,
            entry.note,
            entry.createdAt
        );
    }
}
