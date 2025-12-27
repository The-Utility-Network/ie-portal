import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import {
  getContract,
  readContract,
  prepareContractCall,
  sendAndConfirmTransaction,
  createThirdwebClient,
} from 'thirdweb';
import { useActiveWallet } from 'thirdweb/react';
import { base } from 'thirdweb/chains';
import { getDiamondAddress } from '../primitives/Diamond';
// Browser-safe Thirdweb client getter (fetches clientId from API)
let principlesClientCache: any | null = null;
async function getThirdwebBrowserClient() {
  if (principlesClientCache) return principlesClientCache;
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT;
  if (!clientId) throw new Error('Thirdweb client is not configured');
  principlesClientCache = createThirdwebClient({ clientId });
  return principlesClientCache;
}

// Replace with your actual contract address
let contractAddressPromise: Promise<string> | null = null;
const getContractAddress = async () => {
  if (!contractAddressPromise) contractAddressPromise = getDiamondAddress();
  return contractAddressPromise;
};

// Contract ABI
const abi: any = [
  // Paste the provided ABI here
  { "inputs": [], "name": "EnumerableSet__IndexOutOfBounds", "type": "error" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "name": "PrinciplesAccepted", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "string", "name": "oldName", "type": "string" }, { "indexed": false, "internalType": "string", "name": "newName", "type": "string" }], "name": "SignerNameUpdated", "type": "event" },
  { "inputs": [{ "internalType": "string", "name": "name", "type": "string" }], "name": "acceptPrinciples", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "getAcceptanceSignature", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "pure", "type": "function" },
  { "inputs": [], "name": "getAllPrinciples", "outputs": [{ "components": [{ "internalType": "string", "name": "japaneseName", "type": "string" }, { "internalType": "string", "name": "englishName", "type": "string" }, { "internalType": "string", "name": "description", "type": "string" }], "internalType": "struct TUCOperatingPrinciples.Principle[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getAllSigners", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }], "name": "getPrinciple", "outputs": [{ "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getPrincipleCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getSignerCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }], "name": "getSignerDetails", "outputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "hasPrinciplesAccepted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "initializePrinciples", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "isPrinciplesInitialized", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }, { "internalType": "string", "name": "newName", "type": "string" }], "name": "updateSignerName", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// Define a set of unique colors for expanded accordions
const principleColors = [
  'rgba(255, 99, 132, 0.2)',   // Light Red
  'rgba(54, 162, 235, 0.2)',   // Light Blue
  'rgba(255, 206, 86, 0.2)',   // Light Yellow
  'rgba(75, 192, 192, 0.2)',   // Light Teal
  'rgba(153, 102, 255, 0.2)',  // Light Purple
  'rgba(255, 159, 64, 0.2)',   // Light Orange
  'rgba(199, 199, 199, 0.2)',  // Light Gray
  'rgba(255, 205, 86, 0.2)',   // Another Light Yellow
];

// Styled components with glassmorphism effect
const StyledAccordion = styled(Accordion)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  color: '#FFFFFF',
  marginBottom: theme.spacing(1),
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  '&::before': {
    display: 'none',
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  '& .MuiAccordionSummary-content': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme, expanded }: { theme: any, expanded: boolean }) => ({
  backgroundColor: expanded ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
  backdropFilter: 'blur(8px)',
  borderRadius: '0 0 12px 12px',
  padding: theme.spacing(2),
  transition: 'background-color 0.3s ease',
}));

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#F54029',
  color: '#FFFFFF',
  '&:hover': {
    backgroundColor: '#D03824',
  },
  marginTop: theme.spacing(2),
  borderRadius: '24px',
  padding: '12px 24px',
  fontSize: '16px',
  minWidth: '150px',
}));

const CustomInput = styled('input')(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(8px)',
  color: '#FFFFFF',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '8px',
  padding: '12px 16px',
  width: '100%',
  maxWidth: '400px',
  marginTop: '10px',
  fontSize: '16px',
  outline: 'none',
  transition: 'border 0.3s ease',
  '&:focus': {
    border: '1px solid #F54029',
  },
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  color: '#FFFFFF',
}));

const OperatingPrinciples = () => {
  const [principles, setPrinciples] = useState<any[]>([]);
  const [signerCount, setSignerCount] = useState<number>(0);
  const [hasAccepted, setHasAccepted] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedIndex, setExpandedIndex] = useState<number | false>(false);

  const wallet = useActiveWallet()?.getAccount() as any;

  // Responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchPrinciples();
    fetchSignerCount();
    if (wallet) {
      checkIfUserHasAccepted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const fetchPrinciples = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const result = await readContract({
        contract,
        method: 'getAllPrinciples',
        params: [],
      });

      setPrinciples(result);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching principles:', error);
    }
  };

  const fetchSignerCount = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const count = await readContract({
        contract,
        method: 'getSignerCount',
        params: [],
      });

      setSignerCount(Number(count));
    } catch (error) {
      console.error('Error fetching signer count:', error);
    }
  };

  const checkIfUserHasAccepted = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const accepted = await readContract({
        contract,
        method: 'hasPrinciplesAccepted',
        params: [wallet.address],
      });

      setHasAccepted(accepted);
    } catch (error) {
      console.error('Error checking acceptance:', error);
    }
  };

  const handleAcceptPrinciples = async () => {
    if (!userName.trim()) {
      alert('Please enter your name before signing.');
      return;
    }

    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const transaction = prepareContractCall({
        contract,
        method: 'acceptPrinciples',
        params: [userName],
        value: BigInt(0),
      });

      await sendAndConfirmTransaction({
        transaction,
        account: wallet!,
      });

      setHasAccepted(true);
      fetchSignerCount();
    } catch (error) {
      console.error('Error accepting principles:', error);
    }
  };

  const handleAccordionChange = (index: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedIndex(isExpanded ? index : false);
  };

  if (loading) {
    return <StyledTypography variant="h6">Loading Operating Principles...</StyledTypography>;
  }

  return (
    <Box
      sx={{
        backgroundColor: 'rgba(128, 80, 128, 0.85)',
        backdropFilter: 'blur(10px)',
        maxHeight: isMobile ? '75vh' : '100vh',
        marginTop: isMobile ? '150px' : '40px',
        borderRadius: '40px',
        padding: isMobile ? 2 : 4,
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
      }}
    >
      <StyledTypography variant={isMobile ? "h4" : "h3"} gutterBottom align="center">
        Invisible Enemies Operating Principles
      </StyledTypography>
      <StyledTypography variant="subtitle1" gutterBottom align="center">
        Total Signers: {signerCount}
      </StyledTypography>

      <Box
        sx={{
          width: '100%',
          maxWidth: '800px',
        }}
      >
        {principles.map((principle: { japaneseName: any; englishName: any; description: any; }, index: number) => (
          <StyledAccordion
            key={index}
            expanded={expandedIndex === index}
            onChange={handleAccordionChange(index)}
            sx={{
              backgroundColor: expandedIndex === index ? principleColors[index % principleColors.length] : 'rgba(255, 255, 255, 0.1)',
              transition: 'background-color 0.1s ease',
            }}
          >
            <StyledAccordionSummary
              expandIcon={<ExpandMoreIcon style={{ color: '#FFFFFF' }} />}
            >
              <Box display="flex" flexDirection="column">
                <StyledTypography variant="h6">
                  {principle.japaneseName} - {principle.englishName}
                </StyledTypography>
              </Box>
            </StyledAccordionSummary>
            <StyledAccordionDetails expanded={expandedIndex === index} theme={undefined}>
              <StyledTypography variant="body1">
                {principle.description}
              </StyledTypography>
            </StyledAccordionDetails>
          </StyledAccordion>
        ))}
      </Box>

      {!hasAccepted ? (
        <Box
          mt={4}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: isMobile ? 2 : 4,
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
          }}
        >
          <StyledTypography variant={isMobile ? "h5" : "h4"} gutterBottom>
            Uphold Our Values
          </StyledTypography>
          <StyledTypography variant="body1" gutterBottom>
            By signing, you commit to embodying and upholding our operating principles. Your dedication ensures that we maintain excellence, integrity, and a harmonious work environment.
          </StyledTypography>
          <StyledTypography variant="body1" gutterBottom>
            Please enter your name below to signify your acceptance and commitment.
          </StyledTypography>
          <CustomInput
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e: { target: { value: any; }; }) => setUserName(e.target.value)}
          />
          <StyledButton onClick={handleAcceptPrinciples}>
            Sign Principles
          </StyledButton>
        </Box>
      ) : (
        <Box
          mt={4}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: isMobile ? 2 : 4,
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
          }}
        >
          <StyledTypography variant={isMobile ? "h5" : "h4"} color="success.main" gutterBottom>
            Thank You for Signing!
          </StyledTypography>
          <StyledTypography variant="body1">
            Your commitment to our operating principles strengthens our company&apos;s foundation and fosters a culture of excellence and integrity.
          </StyledTypography>
        </Box>
      )}
    </Box>
  );
};

export default OperatingPrinciples;
