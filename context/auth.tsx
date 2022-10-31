import { ReactNode, createContext, useState, useEffect } from "react";
import { Web3Provider } from "@ethersproject/providers";
import { CHAIN_ID } from "../helpers/constants";
import { IAuthContext } from "../types";;
import { ADDRESS } from "../graphql";
import { useCancellableQuery } from "../hooks/useCancellableQuery";
import { timeout } from "../helpers/functions";

export const AuthContext = createContext<IAuthContext>({
    provider: undefined,
    address: undefined,
    accessToken: undefined,
    primayProfileID: undefined,
    primaryHandle: undefined,
    isCreatingProfile: false,
    isCreatingBadge: false,
    profileCount: 0,
    badgeCount: 0,
    badges: [],
    profiles: [],
    setProvider: () => { },
    setAddress: () => { },
    setAccessToken: () => { },
    setPrimayProfileID: () => { },
    setPrimaryHandle: () => { },
    setIsCreatingProfile: () => { },
    setIsCreatingBadge: () => { },
    setProfileCount: () => { },
    setBadgeCount: () => { },
    setBadges: () => { },
    setProfiles: () => { },
    checkNetwork: async () => new Promise(() => { }),
});
AuthContext.displayName = "AuthContext";

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    /* State variable to store the provider */
    const [provider, setProvider] = useState<Web3Provider | undefined>(
        undefined
    );

    /* State variable to store the address */
    const [address, setAddress] = useState<string | undefined>(undefined);

    /* State variable to store the profile ID */
    const [primayProfileID, setPrimayProfileID] = useState<number | undefined>(undefined);

    /* State variable to store the handle */
    const [primaryHandle, setPrimaryHandle] = useState<string | undefined>(undefined);

    /* State variable to store the access token */
    const [accessToken, setAccessToken] = useState<string | undefined>(undefined);

    /* State variable to store the initial number of accounts */
    const [profileCount, setProfileCount] = useState<number>(0);

    /* State variable to store the initial number of badges */
    const [badgeCount, setBadgeCount] = useState<number>(0);

    /* State variable to store the tokenURI for post created */
    const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);

    /* State variable to store the tokenURI for badges created */
    const [isCreatingBadge, setIsCreatingBadge] = useState<boolean>(false);

    /* State variable to store the badges */
    const [badges, setBadges] = useState<any[]>([]);

    /* State variable to store the profiles */
    const [profiles, setProfiles] = useState<any[]>([]);

    useEffect(() => {
        /* Check if the user connected with wallet */
        if (!(provider && address)) return;

        try {
            /* Function to check if the network is the correct one */
            checkNetwork(provider);
        } catch (error) {
            /* Display error message */
            alert(error.message);
        }
    }, [provider, address]);

    useEffect(() => {
        if (!(address && accessToken)) return;

        let query: any;
        let counter: number = 0;

        const fetchData = async () => {
            try {
                query = useCancellableQuery({
                    query: ADDRESS,
                    variables: {
                        address: address,
                        chainID: CHAIN_ID
                    },
                });
                const res = await query;
                /* Get the primary profile */
                const primaryProfile = res?.data?.address?.wallet?.primaryProfile;

                /* Get the badges */
                const edgesPosts = primaryProfile?.essences?.edges;
                const badges = edgesPosts?.map((edge: any) => edge?.node) || [];

                /* Get the profiles */
                const edgesProfiles = res?.data?.address?.wallet?.profiles?.edges;
                const profiles = edgesProfiles?.map((edge: any) => edge?.node) || [];

                if (!isCreatingProfile && !isCreatingBadge) {
                    /* Get the total count of essences */
                    const badgeCount = primaryProfile?.essences?.totalCount;

                    /* Get the total count of profiles */
                    const profileCount = profiles.length;

                    /* Set the profile ID variable*/
                    setPrimayProfileID(primaryProfile?.profileID);

                    /* Set the primaryHandle variable */
                    setPrimaryHandle(primaryProfile?.handle);

                    /* Set the badges */
                    setBadges(badges);

                    /* Set the profiles */
                    setProfiles(profiles);


                    /* Set the initial number of badges */
                    setBadgeCount(badgeCount);

                    /* Set the initial number of accounts */
                    setProfileCount(profileCount);
                } else {
                    /* Get the updated count of essences */
                    const updatedPostCount = primaryProfile?.essences?.totalCount;

                    /* Get the updated count of profiles */
                    const updatedProfileCount = profiles.length;

                    if (badgeCount !== updatedPostCount) {
                        const latestBadge = primaryProfile?.essences?.edges[updatedPostCount - 1]?.node;

                        /* Reset the isCreatingBadge in the state variable */
                        setIsCreatingBadge(false);

                        /* Set the badges in the state variable */
                        setBadges([...badges, latestBadge]);
                        console.log("New badge created");
                        console.log(latestBadge);
                        /* Set the post count in the state variable */
                        setBadgeCount(updatedPostCount);
                    } else if (profileCount !== updatedProfileCount) {
                        const latestProfile = profiles[updatedProfileCount - 1];

                        /* Reset the isCreatingProfile in the state variable */
                        setIsCreatingProfile(false);

                        /* Set the profiles in the state variable */
                        setProfiles([...profiles, latestProfile]);

                        /* Set the profiles count in the state variable */
                        setProfileCount(updatedProfileCount);
                    } else {
                        /* Data hasn't been indexed try to fetch again every 2s */
                        if (counter < 150) {
                            /* Wait 2s before fetching data again */
                            counter++;
                            console.log("Fetching data again.");
                            await timeout(2000);
                            fetchData();
                        } else {
                            /* Cancel the query */
                            query.cancel();
                            console.log("Fetching data cancelled.");

                            /* Reset the isCreatingBadge in the state variable */
                            setIsCreatingBadge(false);

                            /* Reset the isCreatingProfile in the state variable */
                            setIsCreatingProfile(false);
                        }
                    }
                }
            } catch (error) {
                /* Reset the isCreatingBadge in the state variable */
                setIsCreatingBadge(false);

                /* Reset the isCreatingProfile in the state variable */
                setIsCreatingProfile(false);

                console.error(error);
            }
        }
        fetchData();

        return () => {
            if (query) {
                query.cancel();
            }
        }
    }, [address, accessToken, badgeCount, profileCount, isCreatingBadge, isCreatingProfile,]);

    /* Function to check if the network is the correct one */
    const checkNetwork = async (provider: Web3Provider) => {
        try {
            /* Get the network from the provider */
            const network = await provider.getNetwork();

            /* Check if the network is the correct one */
            if (network.chainId !== CHAIN_ID) {
                /* Switch network if the chain id doesn't correspond to Goerli Testnet Network */
                await provider.send("wallet_switchEthereumChain", [{ chainId: "0x" + CHAIN_ID.toString(16) }]);

                /* Trigger a page reload */
                window.location.reload();
            }
        } catch (error) {
            /* This error code indicates that the chain has not been added to MetaMask */
            if (error.code === 4902) {
                await provider.send("wallet_addEthereumChain", [{ chainId: "0x" + CHAIN_ID.toString(16), rpcUrls: ["https://goerli.infura.io/v3/"] }]);

                /* Trigger a page reload */
                window.location.reload();
            } else {
                /* Throw the error */
                throw error;
            }
        }
    }

    return (
        <AuthContext.Provider
            value={{
                provider,
                address,
                accessToken,
                primayProfileID,
                primaryHandle,
                profileCount,
                badgeCount,
                badges,
                profiles,
                isCreatingProfile,
                isCreatingBadge,
                setProvider,
                setAddress,
                setAccessToken,
                setPrimayProfileID,
                setPrimaryHandle,
                setProfileCount,
                setBadgeCount,
                setIsCreatingProfile,
                setIsCreatingBadge,
                setBadges,
                setProfiles,
                checkNetwork,
            }}>
            {children}
        </AuthContext.Provider>
    );
};

