import { Fetcher } from "./fetcher";
import { withButlerClient, messages } from "../buse";

import rootLogger from "../logger";
import { isEmpty } from "underscore";
import { Game } from "../buse/messages";
const logger = rootLogger.child({ name: "location-fetcher" });

export default class LocationFetcher extends Fetcher {
  async work(): Promise<void> {
    const installLocationId = this.space().firstPathElement();

    await withButlerClient(logger, async client => {
      const {
        caves,
        installLocationPath,
        installLocationSize,
      } = await client.call(
        messages.FetchCavesByInstallLocationID({ installLocationId })
      );

      if (isEmpty(caves)) {
        this.pushUnfilteredGames([]);
        return;
      }

      const games: Game[] = [];
      for (const c of caves) {
        games.push(c.game);
      }
      this.pushUnfilteredGames(games, { disableFilters: true });
      this.push({
        location: {
          path: installLocationPath,
          size: installLocationSize,
        },
      });
    });
  }
}
