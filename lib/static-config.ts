/**
 * Static (build-time) version of the configuration data.
 * This is used as a graceful-degradation path when the
 * /api/config route is not available (e.g. Next.js preview).
 */
import environmentsJson from "../data/environments.json"
