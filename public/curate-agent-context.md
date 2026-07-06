# Kleros Curate Agent Context

Load the Curate skill from `/skills/kleros-curate/SKILL.md` before taking action in the app.

## What Curate Is

Curate is a verification layer for policy-driven token-curated registries. A registry can accept submissions, challenges, removals, evidence, arbitration, and governance updates. The app supports discovery, item workflows, address profiles, governed lists, and registry creation.

## Supported Chains

- Ethereum Mainnet: `1`
- Gnosis: `100`
- Sepolia: `11155111`

## Verified Registries

Verified registries are discovered through configured list-of-lists registries:

- Mainnet: `0xba0304273a54dfec1fc7f4bccbf4b15519aecf15`
- Gnosis: `0xe456c79446c4De1A0bA4d06F294Db42bA2fD4F7F`
- Sepolia: `0xD965Ce430afE0423Ff19A5eb08F7C5722EFabCaF`

## Required Agent Behavior

- Read live onchain values before transaction construction.
- Never guess deposits, arbitration costs, challenge periods, courts, policy URIs, MetaEvidence URIs, schemas, or item fields.
- Use the registry policy and MetaEvidence as authoritative.
- Preserve existing contracts, subgraphs, wallet/network logic, factories, and item workflows.
- Validate item JSON before upload.
- Warn users that incorrect MetaEvidence can break frontend visualization.

## Useful Routes

- `/` dashboard and registry discovery.
- `/guide` minimal human and agent guide.
- `/pro` creator support, indexing, and frontend package options.
- `/address/:address` public curator/governor profile.
- `/tcr/:chainId/:registryAddress` registry page.
- `/tcr/:chainId/:registryAddress/:itemID` item page.
- `/factory/:chainId`, `/factory-classic/:chainId`, `/factory-permanent/:chainId` registry creation flows.
