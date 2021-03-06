import React from 'react'

import {
  prefetch,
  routeInfoByPath,
  routeErrorByPath,
  getCurrentRoutePath,
} from '../'
import { isSSR } from '../utils'
import Spinner from './Spinner'
import { withStaticInfo } from './StaticInfo'
import onLocationChange from '../utils/Location'

let instances = []

// TODO:v6 Do we need this anymore? It's for when data changes in
// dev mode and we need the RouteData components to rerender...
// I think we still need it.

// global.reloadAll = () => {
//   instances.forEach(instance => instance.reloadRouteData())
// }

const RouteData = withStaticInfo(
  class RouteData extends React.Component {
    static defaultProps = {
      Loader: Spinner,
    }
    componentDidMount() {
      instances.push(this)
      this.offLocationChange = onLocationChange(() => this.forceUpdate())
    }
    componentWillUnmount() {
      if (this.offLocationChange) this.offLocationChange()
      instances = instances.filter(d => d !== this)
      this.unmounting = true
    }
    // reloadRouteData = () =>
    //   (async () => {
    //     await this.loadRouteData()
    //     this.forceUpdate()
    //   })()
    render() {
      const { children, Loader, staticInfo } = this.props
      const routePath = isSSR() ? staticInfo.path : getCurrentRoutePath()

      // If there was an error reported for this path, throw an error
      if (routeErrorByPath[routePath]) {
        throw new Error(
          `React-Static: <RouteData> could not find any data for this route: ${routePath}. If this is a dynamic route, please remove any reliance on RouteData or withRouteData from this routes components`
        )
      }

      // If we haven't requested the routeInfo yet, or it's loading
      // Show a spinner and prefetch the data
      // TODO:suspense - This will become a suspense resource
      if (!routeInfoByPath[routePath] || !routeInfoByPath[routePath].allProps) {
        ;(async () => {
          await Promise.all([
            prefetch(routePath, { priority: true }),
            new Promise(resolve =>
              setTimeout(resolve, process.env.REACT_STATIC_MIN_LOAD_TIME)
            ),
          ])
          this.forceUpdate()
        })()
        return <Loader />
      }

      // Otherwise, get it from the routeInfoByPath (subsequent client side)
      return children(routeInfoByPath[routePath].allProps)
    }
  }
)

export default RouteData

export function withRouteData(Comp, opts = {}) {
  return props => (
    <RouteData {...opts}>
      {routeData => <Comp {...routeData} {...props} />}
    </RouteData>
  )
}
