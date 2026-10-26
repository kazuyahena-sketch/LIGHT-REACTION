# LIGHT REACTION: ELECTRON TRAIN

A side-scrolling biology mini-game about the light-dependent reactions of photosynthesis. Follow a continuous electron route through PSII, plastoquinone, cytochrome b₆f, plastocyanin, PSI, ferredoxin, FNR, ATP synthase, and the Calvin cycle.

## Run

Open index.html in a current desktop browser. The project uses Canvas 2D and browser APIs with no install, build step, or network dependency.

## Play

- Select **Start Game**. The camera travels from CELL → CHLOROPLAST → GRANUM → THYLAKOID → LIGHT REACTION.
- In the reaction world, the electron moves forward automatically and pauses at each glowing gate. Press **↑ / ↓** or use the on-screen arrows to align with the target lane, then press **Space**, tap the playfield, or select **ผ่านช่อง**. A missed lane leaves the electron at the gate and shows the lane to use. The game tutorial demonstrates this control before the first flight.
- Stop at each glowing biology checkpoint and complete its process-specific interaction. The next route section opens after the checkpoint is saved.
- At a station, drag the playfield to inspect the world; the camera follows the electron again when travel resumes. **Resume Journey** repeats the camera tour, then returns to the latest saved checkpoint.

Station interactions cover water splitting, the PQ redox route, the cytochrome proton pump, plastocyanin transport, PSI light alignment, ferredoxin launch timing, NADP⁺ selection at FNR, ATP synthase coupling, and product delivery to the Calvin cycle.

Align & Pass gates add route control without changing checkpoint order or the reaction-state rules. Water splitting records O₂, four lumen protons, and four electrons; cytochrome b₆f moves four additional H⁺; FNR forms NADPH; ATP synthase consumes four H⁺ to form ATP. ATP and NADPH are delivered to the Calvin cycle while O₂ is released.

Progress is stored in browser local storage on this device. Use the completion panel's **Restart Journey** action to erase the current run and start again. See [ARCHITECTURE.md](ARCHITECTURE.md) for the subsystem map and extension points.
