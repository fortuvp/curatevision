import React, { useCallback, useEffect, useState } from 'react'
import { Alert } from 'components/ui'
import { useWeb3Context } from 'hooks/use-web3-context'

const EIP7702_PREFIX = '0xef0100'
const STORAGE_KEY = '@kleros/curate/alert/smart-contract-wallet-warning'

export default function SmartContractWalletWarning() {
  const { account, library } = useWeb3Context()
  const [isSmartContractWallet, setIsSmartContractWallet] =
    useState<boolean>(false)
  const [showWarning, setShowWarning] = useState<boolean>(true)

  const updateAccountWarningDismissalState = useCallback((account: string) => {
    try {
      const storedValue = localStorage.getItem(`${STORAGE_KEY}:${account}`)
      if (storedValue === null) setShowWarning(true)
      else setShowWarning(JSON.parse(storedValue))
    } catch {
      setShowWarning(true)
    }
  }, [])

  const checkIfSmartContractWallet = useCallback(
    (account: string, library: EthersLibrary) => {
      library
        .getCode(account)
        .then((code: string) => {
          const formattedCode = code.toLowerCase()
          const isEip7702Eoa = formattedCode.startsWith(EIP7702_PREFIX)

          // Do not show warning for EIP-7702 EOAs
          setIsSmartContractWallet(formattedCode !== '0x' && !isEip7702Eoa)
          return null
        })
        .catch((err: Error) => {
          console.error('Error checking smart contract wallet', err)
          setIsSmartContractWallet(false)
        })
    },
    [],
  )

  const handleClose = useCallback(() => {
    setShowWarning(false)
    localStorage.setItem(`${STORAGE_KEY}:${account}`, JSON.stringify(false))
  }, [account])

  useEffect(() => {
    if (!account || !library) {
      setIsSmartContractWallet(false)
      return
    }

    updateAccountWarningDismissalState(account)
    checkIfSmartContractWallet(account, library)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, library])

  if (!showWarning || !isSmartContractWallet) return null

  return (
    <Alert
      message="Smart contract wallet detected"
      description={
        <>
          Some Curate actions may fail from a contract wallet. Use an externally
          owned account.{' '}
          <a
            href="https://docs.kleros.io/welcome/faq#can-i-use-a-smart-contract-account-to-stake-in-the-court"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
        </>
      }
      type="warning"
      banner
      closable
      onClose={handleClose}
    />
  )
}
