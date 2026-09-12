import { Commands } from "../commands"
import { Runtime } from "../../framework/runtime"
import { Effect } from "effect"

export default Runtime.handler(Commands, () =>
  Effect.sync(() => {
    console.error("Specify a command — see --help.")
    process.exit(1)
  }),
)
