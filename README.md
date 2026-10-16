# LIGHT REACTION: ELECTRON TRAIN

A side-scrolling biology mini-game about the light-dependent reactions of photosynthesis. Follow a continuous electron route through PSII, plastoquinone, cytochrome b₆f, plastocyanin, PSI, ferredoxin, FNR, ATP synthase, and the Calvin cycle.

## Run

Open index.html in a current desktop browser. The project uses Canvas 2D and browser APIs with no install, build step, or network dependency.

## Play

- Select **Start Game**. The camera travels from CELL → CHLOROPLAST → GRANUM → THYLAKOID → LIGHT REACTION.
- In the reaction world, the electron moves forward automatically. Press **Space / ↑** or tap the playfield to jump over reactive oxygen hazards. Hold **← / →** to adjust travel speed; press **↓** mid-jump to dive. Use the mouse wheel or **+ / −** to zoom, drag to pan while stopped at a station, and press **0** to refocus.
- Stop at each glowing biology checkpoint and complete its process-specific interaction. The next route section opens after the checkpoint is saved.
- Close the game at any time. **Resume Journey** repeats the camera tour, then returns to the latest saved checkpoint.

Station interactions cover water splitting, the PQ redox route, the cytochrome proton pump, plastocyanin transport, PSI light alignment, ferredoxin launch timing, NADP⁺ selection at FNR, ATP synthase coupling, and product delivery to the Calvin cycle.

Three reactive-oxygen collisions return the electron to the latest checkpoint. Water splitting records O₂, four lumen protons, and four electrons; cytochrome b₆f moves four additional H⁺; FNR forms NADPH; ATP synthase consumes four H⁺ to form ATP. ATP and NADPH are delivered to the Calvin cycle while O₂ is released.

Progress is stored in browser local storage on this device. Use the completion panel's **Restart Journey** action to erase the current run and start again. See [ARCHITECTURE.md](ARCHITECTURE.md) for the subsystem map and extension points.
