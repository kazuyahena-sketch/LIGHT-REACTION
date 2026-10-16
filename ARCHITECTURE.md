# LIGHT REACTION: ELECTRON TRAIN — Side-scrolling Journey Architecture

## Runtime

The game runs directly in a modern browser using Canvas 2D and DOM APIs. There is no external game engine, package manager, build step, or network dependency. Open index.html to run it.

## Performance and localization

This is a browser Canvas 2D project rather than a Godot project, so Godot's profiler and node counters do not apply. Browser Performance and tracing tools were used to inspect the frame loop, script time, style/layout work, JavaScript heap, and Canvas raster activity. The browser does not expose a stable GPU percentage or Canvas draw-call count for this app.

- The game loop stays idle on the start screen, pauses when the document is hidden, and stops after the completion effects finish. During play, HUD values refresh at about 12.5 Hz instead of writing DOM values every frame.
- The cinematic camera tour keeps its normal device-pixel ratio. The side-scrolling Canvas caps its internal render scale at 1×; HTML controls and labels remain browser-rendered and sharp.
- The static backdrop and membrane pattern are cached. Off-screen stations and hazards are culled; ambient particles and Canvas shadow blur are limited to preserve the molecular glow without a full-screen effect.
- The project has no external textures, shader files, or always-running particle nodes. The intro still uses its zoom tour, and the side world keeps focused electron, proton, and station effects.
- Thai UI uses the system Leelawadee UI / Tahoma font stack and keeps scientific names such as PSII, PQ, FNR, ATP, NADPH, and H⁺ in their standard form.

An Edge headless run at 1366×768 with a 1.5× device scale factor measured the side-scrolling pass at about 169 FPS, 5.9 ms average frame interval, and 6.1 ms p95. The internal Canvas scale was 1×; JavaScript heap was about 2.5 MB with roughly 430 DOM nodes. The headless display's refresh rate and hardware differ from a student's computer, so these values are a comparison baseline rather than a device guarantee.

## Application composition

main.js constructs the application subsystems and owns the frame loop. It advances the scene transition, camera, biology animation, journey controller, effects, HUD, and renderer independently.

- OpeningSequence keeps the continuous zoom from CELL → CHLOROPLAST → GRANUM → THYLAKOID → LIGHT REACTION. Each of the four macro stages pauses on its scene for a roughly 20–40 second interactive challenge before the camera moves inward again. A saved reaction checkpoint skips those first-run challenges on resume.
- MacroJourneyController owns the four distinct macro challenges; MacroChallengePanel renders them over the live Canvas view so the player keeps seeing the camera journey.
- RunnerController owns continuous forward movement, jump and dive physics, speed adjustment, collision charge, and checkpoint respawn.
- JourneyController owns the nine checkpoint route, station arrival, mini-game lifecycle, biological outcomes, checkpoint saves, and final product handoff.
- MinigameHost manages isolated station interactions; MinigamePanel renders their DOM controls and feedback.
- GameState persists completed objectives, products, electron supply, lumen protons, the latest checkpoint ID, and the respawn position in browser local storage.
- CameraController and SceneTransition provide smooth zoom, focus, follow, shake, blur, and camera travel. The macro tour and side-scrolling reaction world use the same camera.
- WorldRenderer draws the macro tour and continuous stroma / thylakoid membrane / lumen environment. VFXHooks and AudioHooks expose replaceable effects and sound cues.
- HUDController reports the next station, checkpoint progress, redox charge, H⁺ count, products, and controls.

## Journey checkpoints

The player moves automatically to the right and stops before each station. Each station opens one biology-specific interaction. Completing it updates the reaction state, marks the station complete, saves a checkpoint, and resumes the route. Progress survives closing and reopening the browser.

1. PSII / oxygen-evolving complex — time eight photon captures to split water.
2. Plastoquinone (PQ) — steer the electron through three redox gates.
3. Cytochrome b₆f — release four pump strokes in the visible pressure window to move H⁺ into the lumen.
4. Plastocyanin (PC) — guide the carrier through the lumen current.
5. PSI — use the reflected ray to align the second photon with the PSI sensor; the ray visibly changes direction with the mirror.
6. Ferredoxin (Fd) — charge and time the electron launch to FNR.
7. FNR — bind NADP⁺, route two electrons and add H⁺ before forming NADPH.
8. ATP synthase — align three coupling rings, then send four lumen protons through the turbine to form ATP.
9. Calvin cycle — deliver ATP and NADPH. O₂ is shown leaving the system after water splitting.

Reactive oxygen species (¹O₂ / ROS) are hazards along the travel route. Three collisions consume the electron's redox charge; losing all three returns the player to the latest saved checkpoint.

## Reaction-state flow

- Water splitting records the reaction 2H₂O → 4H⁺ + 4e⁻ + O₂. Four H⁺ enter the lumen, four electrons replenish the transport chain, and O₂ is released.
- Cytochrome b₆f adds four lumen H⁺. Together these pumping steps establish the gradient.
- The electron route is PSII → PQ → cytochrome b₆f → PC → PSI → Fd → FNR → NADPH.
- ATP synthase consumes four lumen H⁺ and forms ATP.
- ATP and NADPH reach the Calvin cycle; O₂ leaves the system.

## Project map

    index.html
    styles/main.css
    src/
      main.js
      core/         state, event bus, stage tour, camera, transition, input
      data/         macro stages, world stations, journey checkpoints and hazards
      gameplay/    runner movement, macro tour challenges, and checkpoint journey controller
      minigame/    mini-game host lifecycle
      world/        Canvas 2D macro and side-scrolling world rendering
      animation/   biology animation hooks
      audio/        sound hooks
      vfx/          visual-effect hooks
      ui/           intro, HUD, mini-games, and explanations

## Extension guidance

- Add future learning areas as isolated checkpoint data and a focused game adapter. Keep their objectives and process logic owned by the journey/gameplay layer.
- Keep camera-tour challenge rules in gameplay/macro-journey.js and their view in ui/macro-challenge-panel.js; keep station interaction rendering in ui/minigame-panel.js.
- Keep biology route positions in data/stations.js and checkpoint order in data/journey.js; renderer layouts should read those definitions.
- Persist only state needed to resume the player and understand the reaction state.
- Keep camera routes smooth when connecting future stages. Do not make the journey depend on instant scene cuts.
