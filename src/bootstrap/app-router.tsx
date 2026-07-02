import React, { Suspense, lazy } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import ErrorPage from 'pages/error-page'
import Loading from 'components/loading'
import usePathValidation from 'hooks/use-path-validation'

const Dashboard = lazy(() => import('pages/dashboard'))
const AddressPage = lazy(() => import('pages/address'))
const CuratePro = lazy(() => import('pages/curate-pro'))
const ItemsRouter = lazy(() => import('pages/items-router'))
const ItemDetailsRouter = lazy(() => import('pages/item-details-router'))

// Exported for preloading on link hover (instant navigation feel)
export const preloadFactory = () => import('pages/factory/index')
export const preloadClassicFactory = () => import('pages/factory-classic/index')
export const preloadPermanentFactory = () =>
  import('pages/factory-permanent/index')

const Factory = lazy(preloadFactory)
const ClassicFactory = lazy(preloadClassicFactory)
const PermanentFactory = lazy(preloadPermanentFactory)

/** Forces children to fully remount when URL params change. */
const RouteReset = ({ children }: { children: React.ReactNode }) => {
  const params = useParams()
  const key = Object.values(params).join('/')
  return <React.Fragment key={key}>{children}</React.Fragment>
}

const AppRouter = () => {
  const [pathResolved, invalidTcrAddr] = usePathValidation()

  if (!pathResolved) return <Loading />
  if (invalidTcrAddr) return <ErrorPage />

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route
          path="/tcr/:chainId/:tcrAddress/:itemID"
          element={
            <RouteReset>
              <ItemDetailsRouter />
            </RouteReset>
          }
        />
        <Route
          path="/tcr/:chainId/:tcrAddress"
          element={
            <RouteReset>
              <ItemsRouter />
            </RouteReset>
          }
        />
        <Route path="/factory/:chainId" element={<Factory />} />
        <Route path="/factory-classic/:chainId" element={<ClassicFactory />} />
        <Route
          path="/factory-permanent/:chainId"
          element={<PermanentFactory />}
        />
        <Route path="/" element={<Dashboard />} />
        <Route path="/address/:address" element={<AddressPage />} />
        <Route path="/pro" element={<CuratePro />} />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRouter
