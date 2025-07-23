// hooks/useVTpassVerification.ts
import { useState, useEffect, useCallback } from 'react'

interface VerificationState {
  isVerifying: boolean
  customerName: string
  customerAddress?: string
  error: string | null
  isVerified: boolean
}

interface ProviderConfig {
  serviceID: string
  name: string
  numberLength: number | number[] // Can be single length or array of valid lengths
  numberPattern?: RegExp
  displayName: string // What to call the number (Smart Card, Meter Number, etc.)
}

// TV Provider configurations with their expected smart card lengths
const TV_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    serviceID: 'dstv',
    name: 'DSTV',
    numberLength: 10,
    numberPattern: /^\d{10}$/,
    displayName: 'Smart Card Number'
  },
  {
    serviceID: 'gotv',
    name: 'GOTV',
    numberLength: 10,
    numberPattern: /^\d{10}$/,
    displayName: 'IUC Number'
  },
  {
    serviceID: 'startimes',
    name: 'Startimes',
    numberLength: 10,
    numberPattern: /^\d{10}$/,
    displayName: 'Smart Card Number'
  },
  {
    serviceID: 'showmax',
    name: 'Showmax',
    numberLength: [10, 11],
    numberPattern: /^\d{10,11}$/,
    displayName: 'Account Number'
  }
]

// Electricity Provider configurations with their expected meter lengths
const ELECTRICITY_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    serviceID: 'ikeja-electric',
    name: 'Ikeja Electric',
    numberLength: 11,
    numberPattern: /^\d{11}$/,
    displayName: 'Meter Number'
  },
  {
    serviceID: 'eko-electric',
    name: 'Eko Electric',
    numberLength: 11,
    numberPattern: /^\d{11}$/,
    displayName: 'Meter Number'
  },
  {
    serviceID: 'kano-electric',
    name: 'Kano Electric',
    numberLength: [10, 11],
    numberPattern: /^\d{10,11}$/,
    displayName: 'Meter Number'
  },
  {
    serviceID: 'abuja-electric',
    name: 'Abuja Electric',
    numberLength: 11,
    numberPattern: /^\d{11}$/,
    displayName: 'Meter Number'
  },
  {
    serviceID: 'enugu-electric',
    name: 'Enugu Electric (EEDC)',
    numberLength: 11,
    numberPattern: /^\d{11}$/,
    displayName: 'Meter Number'
  }
]

const useVTpassVerification = (serviceType: 'tv' | 'electricity') => {
  const [verificationState, setVerificationState] = useState<VerificationState>({
    isVerifying: false,
    customerName: '',
    customerAddress: '',
    error: null,
    isVerified: false
  })

  const configs = serviceType === 'tv' ? TV_PROVIDER_CONFIGS : ELECTRICITY_PROVIDER_CONFIGS

  const getProviderConfig = (serviceID: string): ProviderConfig | null => {
    return configs.find(config => config.serviceID === serviceID) || null
  }

  const isValidLength = (number: string, config: ProviderConfig): boolean => {
    const length = number.length
    if (Array.isArray(config.numberLength)) {
      return config.numberLength.includes(length)
    }
    return length === config.numberLength
  }

  const isValidFormat = (number: string, config: ProviderConfig): boolean => {
    if (!config.numberPattern) return true
    return config.numberPattern.test(number)
  }

  const verifyCustomer = useCallback(async (
    billersCode: string,
    serviceID: string,
    variationCode?: string
  ) => {
    setVerificationState(prev => ({
      ...prev,
      isVerifying: true,
      error: null,
      isVerified: false,
      customerName: '',
      customerAddress: ''
    }))

    try {
      const requestBody: any = {
        billersCode,
        serviceID,
      }

      // Add variation code for electricity if provided
      if (variationCode) {
        requestBody.type = variationCode
      }

      const response = await fetch('/api/vtpass/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any additional headers your API requires
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to verify customer details'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (e) {
          // If we can't parse the error, use the status text
          errorMessage = response.statusText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Handle different possible response structures
      let customerName = ''
      let customerAddress = ''

      // Try different possible customer name fields
      if (data?.content?.Customer_Name) {
        customerName = data.content.Customer_Name
      } else if (data?.Customer_Name) {
        customerName = data.Customer_Name
      } else if (data?.content?.customer_name) {
        customerName = data.content.customer_name
      } else if (data?.customer_name) {
        customerName = data.customer_name
      }

      // Try different possible address fields (mainly for electricity)
      if (data?.content?.Address) {
        customerAddress = data.content.Address
      } else if (data?.Address) {
        customerAddress = data.Address
      } else if (data?.content?.customer_address) {
        customerAddress = data.content.customer_address
      } else if (data?.customer_address) {
        customerAddress = data.customer_address
      }

      if (!customerName) {
        throw new Error('Customer details found but name is missing')
      }

      setVerificationState({
        isVerifying: false,
        customerName,
        customerAddress,
        error: null,
        isVerified: true
      })

    } catch (error) {
      console.error('Verification error:', error)
      setVerificationState(prev => ({
        ...prev,
        isVerifying: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        isVerified: false
      }))
    }
  }, [])

  const resetVerification = useCallback(() => {
    setVerificationState({
      isVerifying: false,
      customerName: '',
      customerAddress: '',
      error: null,
      isVerified: false
    })
  }, [])

  return {
    verificationState,
    verifyCustomer,
    resetVerification,
    getProviderConfig,
    isValidLength,
    isValidFormat,
    configs
  }
}

export default useVTpassVerification