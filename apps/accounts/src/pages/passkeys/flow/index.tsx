import {
    CenteredFlex,
    VerticallyCentered,
} from '@ente/shared/components/Container';
import EnteButton from '@ente/shared/components/EnteButton';
import EnteSpinner from '@ente/shared/components/EnteSpinner';
import FormPaper from '@ente/shared/components/Form/FormPaper';
import { logError } from '@ente/shared/sentry';
import InfoIcon from '@mui/icons-material/Info';
import { Box, Typography } from '@mui/material';
import { t } from 'i18next';
import _sodium from 'libsodium-wrappers';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
    BeginPasskeyAuthenticationResponse,
    beginPasskeyAuthentication,
    finishPasskeyAuthentication,
} from 'services/passkeysService';

const PasskeysFlow = () => {
    const [errored, setErrored] = useState(false);

    const [invalidInfo, setInvalidInfo] = useState(false);

    const [loading, setLoading] = useState(true);

    const init = async () => {
        const searchParams = new URLSearchParams(window.location.search);

        // get redirect from the query params
        const redirect = searchParams.get('redirect') as string;

        const redirectURL = new URL(redirect);
        if (process.env.NEXT_PUBLIC_DISABLE_REDIRECT_CHECK !== 'true') {
            if (
                redirect !== '' &&
                !redirectURL.host.endsWith('.ente.io') &&
                redirectURL.protocol !== 'ente:' &&
                redirectURL.protocol !== 'enteauth:'
            ) {
                setInvalidInfo(true);
                setLoading(false);
                return;
            }
        }

        // get passkeySessionID from the query params
        const passkeySessionID = searchParams.get('passkeySessionID') as string;

        setLoading(true);

        let beginData: BeginPasskeyAuthenticationResponse;

        try {
            beginData = await beginAuthentication(passkeySessionID);
        } catch (e) {
            logError(e, "Couldn't begin passkey authentication");
            setErrored(true);
            return;
        } finally {
            setLoading(false);
        }

        let credential: Credential | null = null;

        let tries = 0;
        const maxTries = 3;

        while (tries < maxTries) {
            try {
                credential = await getCredential(beginData.options.publicKey);
            } catch (e) {
                logError(e, "Couldn't get credential");
                continue;
            } finally {
                tries++;
            }

            break;
        }

        if (!credential) {
            setErrored(true);
            return;
        }

        setLoading(true);

        let finishData;

        try {
            finishData = await finishAuthentication(
                credential,
                passkeySessionID,
                beginData.ceremonySessionID
            );
        } catch (e) {
            logError(e, "Couldn't finish passkey authentication");
            setErrored(true);
            setLoading(false);
            return;
        }

        const encodedResponse = _sodium.to_base64(JSON.stringify(finishData));

        window.location.href = `${redirect}?response=${encodedResponse}`;
    };

    const beginAuthentication = async (sessionId: string) => {
        const data = await beginPasskeyAuthentication(sessionId);
        return data;
    };

    const getCredential = async (
        publicKey: any
    ): Promise<Credential | null> => {
        publicKey.challenge = _sodium.from_base64(
            publicKey.challenge,
            _sodium.base64_variants.URLSAFE_NO_PADDING
        );
        publicKey.allowCredentials?.forEach(function(listItem: any) {
            listItem.id = _sodium.from_base64(
                listItem.id,
                _sodium.base64_variants.URLSAFE_NO_PADDING
            );
        });

        const credential = await navigator.credentials.get({
            publicKey,
        });

        return credential;
    };

    const finishAuthentication = async (
        credential: Credential,
        sessionId: string,
        ceremonySessionId: string
    ) => {
        const data = await finishPasskeyAuthentication(
            credential,
            sessionId,
            ceremonySessionId
        );
        return data;
    };

    useEffect(() => {
        init();
    }, []);

    if (loading) {
        return (
            <VerticallyCentered>
                <EnteSpinner />
            </VerticallyCentered>
        );
    }

    if (invalidInfo) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%">
                <Box maxWidth="30rem">
                    <FormPaper
                        style={{
                            padding: '1rem',
                        }}>
                        <InfoIcon />
                        <Typography fontWeight="bold" variant="h1">
                            {t('PASSKEY_LOGIN_FAILED')}
                        </Typography>
                        <Typography marginTop="1rem">
                            {t('PASSKEY_LOGIN_URL_INVALID')}
                        </Typography>
                    </FormPaper>
                </Box>
            </Box>
        );
    }

    if (errored) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%">
                <Box maxWidth="30rem">
                    <FormPaper
                        style={{
                            padding: '1rem',
                        }}>
                        <InfoIcon />
                        <Typography fontWeight="bold" variant="h1">
                            {t('PASSKEY_LOGIN_FAILED')}
                        </Typography>
                        <Typography marginTop="1rem">
                            {t('PASSKEY_LOGIN_ERRORED')}
                        </Typography>
                        <EnteButton
                            onClick={() => {
                                setErrored(false);
                                init();
                            }}
                            fullWidth
                            style={{
                                marginTop: '1rem',
                            }}
                            color="primary"
                            type="button"
                            variant="contained">
                            {t('TRY_AGAIN')}
                        </EnteButton>
                    </FormPaper>
                </Box>
            </Box>
        );
    }

    return (
        <>
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%">
                <Box maxWidth="30rem">
                    <FormPaper
                        style={{
                            padding: '1rem',
                        }}>
                        <InfoIcon />
                        <Typography fontWeight="bold" variant="h1">
                            {t('LOGIN_WITH_PASSKEY')}
                        </Typography>
                        <Typography marginTop="1rem">
                            {t('PASSKEY_FOLLOW_THE_STEPS_FROM_YOUR_BROWSER')}
                        </Typography>
                        <CenteredFlex marginTop="1rem">
                            <Image
                                alt="ente Logo Circular"
                                height={150}
                                width={150}
                                src="/images/ente-circular.png"
                            />
                        </CenteredFlex>
                    </FormPaper>
                </Box>
            </Box>
        </>
    );
};

export default PasskeysFlow;
