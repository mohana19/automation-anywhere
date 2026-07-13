/**
 * Builders for AA form / process content bodies.
 *
 * The exact JSON shapes below were captured live from the Control Room by
 * building a sample in the UI and reading back `GET /repository/files/{id}/content`
 * (see README). Keeping them here isolates the version-specific schema from the
 * transport code in ApiClient.ts.
 */

/**
 * A form definition containing a TextBox, a TextArea and a Number field —
 * one field per row, matching how the Form builder lays them out.
 */
export function buildFormDefinition() {
  return {
    properties: {
      title: 'Form title',
      dimension: { height: 600, width: 600, displayHeight: 600 },
      font: { fontType: 'System', fontSize: 'MEDIUM' },
      closeOnEndMachine: false,
      minimizeOnEndMachine: false,
      hiddenElements: [],
      brandLogos: [],
      logoCount: 'Zero',
    },
    position: { isFormPreviewCentered: false, startX: 650, startY: 10, formPlacement: 'TOP_LEFT' },
    meta: { version: '2.1' },
    rules: [],
    documentElement: {},
    rows: [
      {
        columns: [
          {
            type: 'TextBox',
            fieldType: 'TextBox',
            id: 'TextBox0',
            label: 'TextBox',
            defaultValue: '',
            toolTip: '',
            hintText: '',
            mandatory: false,
            hidden: false,
            readOnly: false,
            width: 100,
            minLength: -1,
            maxLength: -1,
            masked: false,
            regex: '',
            regexErrorMessage: '',
            validationType: 'standard',
          },
        ],
      },
      {
        columns: [
          {
            type: 'TextArea',
            fieldType: 'TextArea',
            id: 'TextArea0',
            label: 'TextArea',
            defaultValue: '',
            toolTip: '',
            hintText: '',
            mandatory: false,
            readOnly: false,
            width: 100,
            minLength: -1,
            maxLength: -1,
            height: 64,
            hidden: false,
          },
        ],
      },
      {
        columns: [
          {
            type: 'Number',
            fieldType: 'Number',
            id: 'Number0',
            label: 'Number',
            defaultValue: '',
            toolTip: '',
            hintText: '',
            mandatory: false,
            readOnly: false,
            width: 100,
            minLength: -1,
            maxLength: -1,
            allowNegative: true,
            allowTrailingZeros: false,
            commaSeparateThousand: false,
            numberOfDecimalPlaces: 3,
            prefixText: '',
            suffixText: '',
            hidden: false,
          },
        ],
      },
    ],
    styles: {},
  };
}

/**
 * A 3-node process/workflow: InitialStep → FormStep → exit, where both steps
 * reference the given form file id.
 *
 * NOTE: the exact `application/vnd.aa.workflow` schema is captured from the
 * Network tab when a process is built in the UI. This placeholder is replaced
 * once that capture is in. // CONFIRM
 */
export function buildProcessDefinition(formFileId: string) {
  return {
    workflow: {
      nodes: [
        { name: 'InitialStep', type: 'form', formFileId, next: 'FormStep' },
        { name: 'FormStep', type: 'form', formFileId, next: 'exit' },
        { name: 'exit', type: 'exit' },
      ],
    },
  };
}
