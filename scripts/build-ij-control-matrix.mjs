/** Builds a conservative, per-control index from the actual browser inventory.
 * Source matching is a navigation aid, not an assertion that a test was executed. */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import ts from 'typescript'
const inventory = JSON.parse(await readFile('docs/evidence/ij/control-inventory.json', 'utf8'))
const records = new Map(inventory.controls.map((control) => [control.id, control]))
const specifications = []
const literal = (node, bindings = new Map()) => {
  if (!node) return null
  if (typeof node === 'string') return node
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node))
    return literal(node.expression, bindings)
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text
    for (const span of node.templateSpans) {
      const part = literal(span.expression, bindings)
      if (part === null) return null
      value += part + span.literal.text
    }
    return value
  }
  if (ts.isIdentifier(node) && bindings.has(node.text))
    return literal(bindings.get(node.text), bindings)
  return null
}
function matchName(node, bindings = new Map()) {
  if (!node) return null
  const text = literal(node, bindings)
  if (text !== null) return { text }
  if (ts.isIdentifier(node) && bindings.has(node.text))
    return matchName(bindings.get(node.text), bindings)
  if (ts.isRegularExpressionLiteral(node)) {
    const raw = node.text,
      last = raw.lastIndexOf('/')
    return { regex: raw.slice(1, last), flags: raw.slice(last + 1).replaceAll('g', '') }
  }
  return null
}
function locator(call, bindings = new Map()) {
  if (call && ts.isIdentifier(call) && bindings.has(call.text))
    return locator(bindings.get(call.text), bindings)
  if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression))
    return null
  const method = call.expression.name.text
  if (['first', 'last', 'nth', 'filter'].includes(method))
    return locator(call.expression.expression, bindings)
  if (method === 'getByRole') {
    const role = literal(call.arguments[0], bindings),
      options = call.arguments[1]
    const property =
      options && ts.isObjectLiteralExpression(options)
        ? options.properties.find(
            (p) =>
              (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
              p.name.getText() === 'name',
          )
        : null
    const name = property
      ? matchName(
          ts.isShorthandPropertyAssignment(property) ? property.name : property.initializer,
          bindings,
        )
      : null
    return name ? { role, ...name } : null
  }
  if (['getByLabel', 'getByText'].includes(method)) {
    const name = matchName(call.arguments[0], bindings)
    return name ? { role: null, ...name } : null
  }
  return null
}
function action(node, bindings = new Map()) {
  if (!ts.isCallExpression(node)) return null
  if (ts.isIdentifier(node.expression)) {
    const helper = node.expression.text
    const index = helper === 'download' ? 1 : 0
    const text = literal(node.arguments[index], bindings)
    if (text && ['openAndClose', 'followLink', 'setup', 'download'].includes(helper))
      return {
        role: helper === 'followLink' ? 'link' : helper === 'setup' ? 'radio' : 'button',
        text,
        action:
          helper === 'openAndClose'
            ? 'click + Escape/focus check'
            : helper === 'setup'
              ? 'check'
              : helper === 'download'
                ? 'click + verify download'
                : 'click + route assertion',
      }
  }
  if (!ts.isPropertyAccessExpression(node.expression)) return null
  const method = node.expression.name.text
  if (
    !['click', 'check', 'uncheck', 'fill', 'selectOption', 'setInputFiles', 'focus'].includes(
      method,
    )
  )
    return null
  const target = locator(node.expression.expression, bindings)
  return target ? { ...target, action: method } : null
}
for (const filename of (await readdir('e2e')).filter((file) => file.endsWith('.spec.ts'))) {
  const path = `e2e/${filename}`,
    raw = await readFile(path, 'utf8'),
    source = ts.createSourceFile(path, raw, ts.ScriptTarget.Latest, true)
  const visit = (node, title = 'shared test helper', bindings = new Map()) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'test'
    )
      title = literal(node.arguments[0], bindings) ?? title
    if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
      const binding = node.initializer.declarations[0]?.name
      let iterable = node.expression
      if (ts.isIdentifier(iterable)) iterable = bindings.get(iterable.text) ?? iterable
      if (binding && ts.isIdentifier(binding) && ts.isArrayLiteralExpression(iterable)) {
        for (const value of iterable.elements) {
          const local = new Map(bindings)
          local.set(binding.text, value)
          visit(node.statement, title, local)
        }
        return
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
      bindings.set(node.name.text, node.initializer)
    const found = action(node, bindings)
    if (found)
      specifications.push({
        ...found,
        file: path,
        title,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      })
    const local =
      ts.isBlock(node) ||
      ts.isSourceFile(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionDeclaration(node)
        ? new Map(bindings)
        : bindings
    ts.forEachChild(node, (child) => visit(child, title, local))
  }
  visit(source)
}
const manual = []
const rawCapture = await readFile('scripts/audit-ij-browser.mjs', 'utf8')
const captureSource = ts.createSourceFile(
  'audit',
  rawCapture,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
)
let queue = []
const collect = (node) => {
  const found = action(node)
  if (found) queue.push(found)
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'capture'
  ) {
    const state = literal(node.arguments[0]),
      observed = literal(node.arguments[1])
    if (state && inventory.observations.some((item) => item.name === state)) {
      for (const item of queue) manual.push({ ...item, state, observed })
      queue = []
    }
  }
  ts.forEachChild(node, collect)
}
collect(captureSource)
const normalize = (text) => text.replace(/^✓\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase()
function matches(control, candidate) {
  const role =
    control.tag === 'a'
      ? 'link'
      : control.tag === 'button'
        ? 'button'
        : control.tag === 'select'
          ? 'combobox'
          : control.type === 'radio'
            ? 'radio'
            : control.type === 'checkbox'
              ? 'checkbox'
              : control.type === 'range'
                ? 'slider'
                : control.type === 'search'
                  ? 'searchbox'
                  : control.type === 'number'
                    ? 'spinbutton'
                    : control.tag === 'input' || control.tag === 'textarea'
                      ? 'textbox'
                      : null
  if (
    candidate.role &&
    candidate.role !== role &&
    !(
      candidate.role === 'tab' &&
      control.tag === 'button' &&
      ['Live state', 'Timeline', 'Why?', 'Variables', 'Program', 'Blocks', 'Code preview'].includes(
        control.label,
      )
    )
  )
    return false
  if (candidate.regex) {
    try {
      return new RegExp(candidate.regex, candidate.flags).test(control.label)
    } catch {
      return false
    }
  }
  const a = normalize(control.label),
    b = normalize(candidate.text)
  return a === b || ((control.tag === 'select' || control.tag === 'input') && a.startsWith(b))
}
const expected = {
  Credits: 'Open attribution and license dialog.',
  'Keyboard help': 'Open the actual shortcut legend.',
  'Keyboard shortcuts': 'Open the shortcut legend for this screen.',
  Close: 'Close the current dialog and return keyboard focus.',
  Next: 'Validate/save the current onboarding step, then advance.',
  Back: 'Return one onboarding step without discarding entered values.',
  'Skip intro': 'Create/reuse a pseudonym and open the selected starting route.',
  'Shuffle name': 'Generate a safe local alias.',
  'Create my local alias & start': 'Save the alias and open the chosen activity/tutorial.',
  'Clear search': 'Remove the mission search query.',
  'Reset filters': 'Restore search, concepts, difficulty and sort defaults.',
  'Clear filters': 'Recover from an empty filtered mission list.',
  Preview: 'Open a read-only mission briefing without creating an attempt.',
  'Close preview': 'Close preview and restore the originating card focus.',
  'Mission briefing': 'Show objective, vocabulary, success scenarios and teacher notes.',
  Save: 'Persist the current world/program/stage; report durable or in-memory status accurately.',
  'Reset code': 'Confirm edited-code reset; retain immutable attempt history.',
  'Reset simulation': 'Return the transient robot/timeline to the recorded start.',
  Run: 'Request a prediction or execute the valid current program when permitted.',
  Pause: 'Freeze playback at the current preserved cursor.',
  Resume: 'Continue playback or navigate to a real saved draft, according to context.',
  Stop: 'Cancel active computation/playback safely.',
  'Stop & Edit': 'Cancel/reset transient execution before permitting authoring.',
  'Step code': 'Advance one meaningful source action and its associated ticks.',
  'Step tick': 'Advance exactly one50ms physical tick.',
  Rewind: 'Move to an earlier preserved state without rewriting an attempt.',
  Replay: 'Replay the same run without another attempt or score.',
  'Reset layout': 'Restore default panel widths and visibility.',
  Help: 'Show the mission-specific progressive hint ladder and record assistance.',
  'Open block editor': 'Open real Blockly from the current validated AST.',
  'Close block editor': 'Close the editor without executing unapplied blocks.',
  'Apply blocks':
    'Validate connected blocks, apply their AST, and invalidate old transient prediction state.',
  'Auto-layout': 'Arrange actual Blockly blocks without changing AST semantics.',
  Blocks: 'Show the Blockly editing surface.',
  'Code preview': 'Show inert code derived from the workspace AST.',
  'Copy pseudocode': 'Copy the program printer output and announce success.',
  'Fit world': 'Restore camera fit without changing world coordinates.',
  Grid: 'Toggle grid presentation only.',
  'Sensor ray': 'Toggle the measured sensor ray presentation only.',
  'Follow robot': 'Toggle camera tracking without affecting physics.',
  'Snapshot stage': 'Download the actual stage as an SVG.',
  'Fullscreen stage': 'Enter/exit browser fullscreen or explain platform refusal.',
  'Sensor details': 'Expose units, sensor origins/range/tick and null semantics.',
  'Robot state': 'Expose actual position, heading, status and stop cause.',
  'Lock prediction & run':
    'Lock the prediction before executing and revealing authoritative output.',
  'I need a hint': 'Open conceptual help and record assistance.',
  'Show decision in timeline': 'Select the actual deciding event and preserved snapshot.',
  'Investigate why': 'Open optional/targeted evidence questions without claiming certainty.',
  'Start a new attempt': 'Create fresh prediction state while preserving historical attempts.',
  'Change code': 'Reset the transient attempt and open the real code editor.',
  'Save summary': 'Download a nonidentifying summary of recorded execution.',
  'Share progress': 'Export the same local summary; no social transmission.',
  'Live state': 'Show the selected event’s actual robot/sensor state.',
  Timeline: 'Show searchable/filterable recorded events.',
  'Why?': 'Explain recorded evaluated operands and branch.',
  Variables: 'Show actual values and last source changes.',
  Program: 'Show actual run identity, engine version and budgets.',
  'Why did that happen?': 'Select the exact comparison/source event.',
  'Step back': 'Select the previous recorded event.',
  'Step forward': 'Select the next recorded event.',
  'Why are you asking?': 'Explain which executed model predictions the probe separates.',
  'Show me a hint': 'Reveal one scaffold and record help.',
  'Try it in the lab': 'Open a distinct isolated practice example without altering the mission.',
  'Try a different example': 'Choose a different valid discriminator.',
  'I still don’t get it': 'Show worked reasoning and prerequisite guidance.',
  'Back to mission': 'Return to the preserved mission state.',
  'Continue to experiment':
    'Open a verified experiment, transparently recording any skipped assessment.',
  'Generate a targeted experiment': 'Search/rank validated one-change candidate scenarios.',
  'Baseline scenario': 'Show the baseline using the same camera transform.',
  'Changed scenario': 'Show the changed scenario using the same camera transform.',
  'Lock experiment prediction': 'Commit a changed-outcome answer before reveal.',
  'Run experiment': 'Reveal authoritative output for the locked changed scenario.',
  'Reset experiment': 'Restore the generated scenario and fresh prediction entry.',
  'Explain comparison': 'Show trace-derived baseline/changed differences.',
  'Try another counterexample': 'Select another ranked valid candidate or explain exhaustion.',
  'Return to mission': 'Restore the preserved mission view.',
  'Test my understanding with new numbers': 'Open a distinct transfer task.',
  'Lock transfer prediction & reveal':
    'Record the transfer answer before revealing executed truth.',
  'Review evidence': 'Open the immutable question/experiment/transfer timeline.',
  'Retry transfer': 'Create a fresh legitimate transfer answer, preserving earlier responses.',
  Finish: 'Persist the investigation; award completion only from real criteria.',
  'Run freely without prediction': 'Execute sandbox code without mandatory assessment.',
  'Try prediction mode': 'Reset voluntary sandbox prediction entry.',
  'Generate experiment': 'Open generated practice using the current valid world/program.',
  'Reset everything': 'Confirm reset of transient lab world/code/run; retain saved history.',
  'Create local team': 'Validate2–6 aliases and create a local role-assigned session.',
  'Edit team': 'Confirm alias edits while preserving learner IDs/history.',
  'End session': 'Confirm the end of the current local team session.',
  'Reset team': 'Confirm deletion of this session/assignment only.',
  'Pause team session': 'Persist a paused local session without dropping contributions.',
  'Resume session': 'Resume behind the privacy handoff screen.',
  'Export session summary': 'Download actual team predictions/contributions/results.',
  'Undo my draft': 'Clear only the current unlocked prediction/contribution draft.',
  'Export my progress': 'Download only the selected learner’s supported records.',
  'Clear my progress': 'Confirm learner-scoped erasure.',
  'Delete all local learner data': 'Require strong confirmation before full local erasure.',
  'Reset local instructor view': 'Clear report filters without erasing data.',
  'Print summary': 'Open the actual browser print view.',
  'Export filtered CSV': 'Download selected real rows with spreadsheet-dangerous prefixes escaped.',
  'Export filtered JSON': 'Download a validated scoped envelope supported by included evidence.',
  'Export local data': 'Download the full versioned browser-local dataset.',
  'Erase everything': 'Require typed confirmation and reset all local records.',
  'Retry storage': 'Retry durable persistence without overwriting unreadable records.',
  'See logic trace': 'Toggle the sample’s actual interpreter event list.',
}
function intention(control) {
  if (control.href)
    return control.href.startsWith('http')
      ? `Open the explicit external source/license URL: ${control.href}`
      : `Navigate to ${control.href}, preserving local records.`
  if (expected[control.label]) return expected[control.label]
  if (control.tag === 'summary')
    return 'Expand/collapse this native disclosure using pointer or keyboard.'
  if (/^Event \d+:/.test(control.label))
    return 'Select this exact recorded event, source block and preserved state.'
  if (/^Pan /.test(control.label))
    return 'Translate the camera in the named direction; physical coordinates remain unchanged.'
  if (/^Zoom /.test(control.label)) return 'Change bounded camera scale only.'
  if (/^(Undo|Redo)/.test(control.label))
    return 'Apply the named real edit-history operation; preserve immutable run records.'
  if (/^(Show|Hide) (code|trace)/.test(control.label))
    return 'Toggle the named workstation panel without changing execution.'
  if (/^I’m .+ready/.test(control.label))
    return 'Reveal only the current learner’s private role/prediction card.'
  if (/Hand off/.test(control.label))
    return 'Lock the current member’s contribution/prediction and hide it behind the next handoff.'
  if (control.tag === 'select')
    return 'Choose the named filter, world, program, playback or participant option; inspect its resulting state.'
  if (control.tag === 'input' || control.tag === 'textarea')
    return control.type === 'radio'
      ? 'Select this named answer/role/activity option before committing it.'
      : control.type === 'checkbox'
        ? 'Toggle this explicitly labeled preference or learning option.'
        : control.type === 'range'
          ? 'Adjust the named bounded numeric/camera/layout value; world semantics follow the specific control.'
          : control.type === 'file'
            ? 'Choose bounded data for validation/preview before any replacement.'
            : 'Edit the labeled value; validation and persistence follow the screen contract.'
  return 'Execute the named screen action according to the existing source contract; exact outcome must be checked in the cited evidence.'
}
const rows = new Map()
for (const observation of inventory.observations)
  for (const id of observation.controlIds) {
    const control = records.get(id)
    const key = JSON.stringify([observation.route, control.tag, control.label, control.href])
    if (!rows.has(key))
      rows.set(key, { route: observation.route, control, states: [], disabled: new Set() })
    const row = rows.get(key)
    if (!row.states.includes(observation.name)) row.states.push(observation.name)
    row.disabled.add(control.disabled)
  }
const escape = (text) => String(text).replaceAll('|', '\\|').replaceAll('\n', ' ')
let markdown =
  '\n\n<!-- IJ_CONTROL_MATRIX_START -->\n## Part I/J exact route and control inventory (2026-10-24)\n\n'
markdown += `The committed [machine inventory](evidence/ij/control-inventory.json) contains ${inventory.observations.length} actual Chromium screen captures and ${rows.size} distinct route/control identities. All 11 routes were measured at 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024 and 390×844: zero global overflow and zero page exceptions. The final capture requested assets only from the local production origin. Eight representative frames were opened and retained in [screenshots](evidence/ij/screenshots). The full capture is reproducible with \`scripts/audit-ij-browser.mjs\`.\n\n`
markdown +=
  '**Evidence codes:** `OBSERVED ACTION` means the real capture script activated the named control and the next captured state records the outcome. `SPEC ACTION` means an exact/regex-named action exists in the linked persistent Playwright test; executed pass/fail results are recorded separately in TEST_REPORT. `VISIBLE ONLY` records an enabled rendered control whose exact action is not established by this conservative name index; this is explicitly not a passing action claim. `DISABLED` records a guarded control. Shared-component rows repeat across routes and do not claim each duplicate was independently hand-clicked. Generated event/answer labels are data, not new implementations. Source-only matches and photographs are not substituted for actual click results.\n\n'
markdown +=
  '| Route | Named control (tag) | Initial/captured state | Intended action | Actual result / proof | Accessibility note | Status | Remaining issue |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n'
const counts = {}
const unresolved = []
for (const row of rows.values()) {
  const { control } = row
  const observed = manual.find((candidate) => matches(control, candidate))
  const proofs = specifications.filter((candidate) => matches(control, candidate)).slice(0, 2)
  const disabled = [...row.disabled]
  const status = observed
    ? 'OBSERVED ACTION'
    : proofs.length
      ? 'SPEC ACTION'
      : disabled.every(Boolean)
        ? 'DISABLED'
        : 'VISIBLE ONLY'
  counts[status] = (counts[status] ?? 0) + 1
  if (status === 'VISIBLE ONLY')
    unresolved.push({
      route: row.route,
      label: control.label,
      tag: control.tag,
      type: control.type,
      href: control.href,
    })
  const proof = observed
    ? `${observed.observed} Capture: ${observed.state}.`
    : proofs.length
      ? proofs.map((p) => `[${p.action}; ${p.title}](../${p.file}#L${p.line})`).join('; ')
      : `Visible in ${row.states[0]}; no named action claim.`
  const accessibility = control.label
    ? control.tag === 'summary'
      ? 'Native keyboard disclosure.'
      : control.tag === 'a'
        ? 'Named keyboard link.'
        : 'Named semantic control; focus/keyboard proof remains with the referenced test.'
    : 'No text name recorded; inspect label/source before certifying.'
  const remaining =
    status === 'VISIBLE ONLY'
      ? 'Conservative index has no exact action proof; consult route/unit coverage or add a targeted check.'
      : status === 'DISABLED'
        ? 'Guard must explain when the action becomes available.'
        : control.href?.startsWith('http')
          ? 'External destination not navigated by the local privacy audit.'
          : 'No failure established by this row; final suite result is separate.'
  markdown += `| ${escape(row.route)} | ${escape(control.label || '(unnamed)')} (${control.tag}) | ${disabled.length > 1 ? 'Enabled and disabled states captured' : disabled[0] ? 'Disabled' : 'Enabled'}; ${escape(row.states[0])} | ${escape(intention(control))} | ${escape(proof)} | ${escape(accessibility)} | ${status} | ${escape(remaining)} |\n`
}
markdown += `\nIndex counts: ${Object.entries(counts)
  .map(([key, value]) => `${key}: ${value}`)
  .join(
    '; ',
  )}. These are control-index counts, not test totals or a claim that every enabled control was hand-clicked.\n<!-- IJ_CONTROL_MATRIX_END -->\n`
const path = 'docs/INTERACTION_AUDIT.md'
let document = await readFile(path, 'utf8')
document = document.replace(
  /\n\n<!-- IJ_CONTROL_MATRIX_START -->[\s\S]*?<!-- IJ_CONTROL_MATRIX_END -->\n?/,
  '',
)
await writeFile(path, document + markdown)
await writeFile(
  'docs/evidence/ij/control-matrix-summary.json',
  JSON.stringify(
    {
      routeControlIdentities: rows.size,
      counts,
      unresolved,
      method:
        'Conservative static action-name index over actual captured controls; TEST_REPORT holds execution results.',
    },
    null,
    2,
  ) + '\n',
)
console.log({ rows: rows.size, counts })
