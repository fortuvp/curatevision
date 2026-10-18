import React, { useEffect, useCallback, useId } from 'react'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import { withFormik, FieldArray, type FormikProps } from 'formik'
import { ItemTypes as AllItemTypes } from '@kleros/gtcr-encoder'
import ItemDetailsCard from 'components/item-details-card'
import objectWithoutKey from 'utils/object-without-key'
import { CurateIcon } from 'components/curate/icons'
import {
  Button,
  IconButton,
  Label,
  Row,
  Stack,
  Surface,
} from 'components/curate/primitives'
import {
  ErrorText,
  FormField,
  Select,
  StepHeader,
  SwitchField,
  TextField,
} from './fields'
import { itemColumnsProblem, itemSchema } from './schemas'
import type { StepProps, TcrState } from '.'

/*
 * Step 2, the item: the fields every entry has (one block per field,
 * stacked so they fit a phone), the list-of-lists switch and the preview
 * of an entry with those fields. The identifier rules and the two submit
 * checks (one ID field, unique names) are the ones the previous step had.
 */

export const ItemTypes = objectWithoutKey(AllItemTypes, 'TWITTER_USER_ID')

const { IMAGE, FILE, GTCR_ADDRESS, LONG_TEXT } = AllItemTypes

const MAX_IDENTIFIERS = 5

export type ItemSection = 'fields' | 'preview'

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
`

type ItemFormValues = TcrState
type ItemParamsOuterProps = StepProps & { section?: ItemSection }
type ItemParamsProps = ItemParamsOuterProps & FormikProps<ItemFormValues>

const ItemParams = ({
  handleSubmit,
  setFieldValue,
  formId,
  section,
  values: { columns, isTCRofTCRs },
  status,
  setTcrState,
  tcrState,
}: ItemParamsProps) => {
  const ids = useId()
  const { tcrLogo, tcrPrimaryDocument, tcrDescription, tcrTitle } =
    tcrState || {}

  const toggleTCRofTCRs = useCallback(() => {
    if (!isTCRofTCRs) {
      setFieldValue(`columns`, [
        {
          label: 'Address',
          description: 'The list address.',
          type: GTCR_ADDRESS,
          isIdentifier: true,
        },
      ])
      setFieldValue(`isTCRofTCRs`, true)
    } else setFieldValue(`isTCRofTCRs`, false)
  }, [isTCRofTCRs, setFieldValue])

  useEffect(() => {
    setTcrState((previousState) => ({
      ...previousState,
      isTCRofTCRs,
      columns,
    }))
  }, [columns, isTCRofTCRs, setTcrState])

  const onTypeChange = (index: number, value: string) => {
    setFieldValue(`columns[${index}].type`, value)
    // Long text and image fields cannot be identifiers.
    if (value === LONG_TEXT || value === IMAGE)
      setFieldValue(`columns[${index}].isIdentifier`, false)
  }

  const identifierCount = columns.filter((column) => column.isIdentifier).length
  const showFields = section !== 'preview'
  const showPreview = section !== 'fields'
  const problem = typeof status === 'string' ? status : ''

  return (
    <Stack $gap={20}>
      {showFields && (
        <form id={formId} onSubmit={handleSubmit} noValidate>
          <Stack $gap={20}>
            <StepHeader
              heading="Define the item fields"
              lede="Each field is a column of the list. Items are displayed in this order, so put the image or the title first."
            />
            <SwitchField
              id={`${ids}-list-of-lists`}
              label="This is a list of lists"
              help="A list of lists has one field, the list address. Each entry's title, description and logo come from the list itself."
              checked={!!isTCRofTCRs}
              onChange={toggleTCRofTCRs}
            />
            {!isTCRofTCRs && (
              <FieldArray name="columns">
                {({ push, remove }) => (
                  <Stack $gap={12}>
                    {columns.map((column, index) => {
                      const canBeIdentifier =
                        (identifierCount < MAX_IDENTIFIERS ||
                          !!column.isIdentifier) &&
                        column.type !== LONG_TEXT &&
                        column.type !== IMAGE &&
                        column.type !== FILE
                      return (
                        <Surface
                          key={index}
                          $padding="compact"
                          role="group"
                          aria-label={`Field ${index + 1}`}
                        >
                          <Stack $gap={12}>
                            <Row $justify="space-between" $gap={8}>
                              <Label>Field {index + 1}</Label>
                              {columns.length > 1 && (
                                <IconButton
                                  type="button"
                                  aria-label={`Remove field ${index + 1}`}
                                  onClick={() => remove(index)}
                                >
                                  <CurateIcon name="remove" size={16} />
                                </IconButton>
                              )}
                            </Row>
                            <FieldGrid>
                              <TextField
                                name={`columns[${index}].label`}
                                label="Name"
                                help="Shown as the field's label when someone submits an item."
                              />
                              <TextField
                                name={`columns[${index}].description`}
                                label="Description"
                                help="Explains what to enter; shown under the field."
                              />
                              <FormField
                                id={`${ids}-type-${index}`}
                                label="Type"
                              >
                                {(a11y) => (
                                  <Select
                                    {...a11y}
                                    value={column.type}
                                    onChange={(event) =>
                                      onTypeChange(index, event.target.value)
                                    }
                                  >
                                    {Object.values(ItemTypes).map(
                                      (itemType) => (
                                        <option
                                          value={String(itemType)}
                                          key={String(itemType)}
                                        >
                                          {String(itemType)}
                                        </option>
                                      ),
                                    )}
                                  </Select>
                                )}
                              </FormField>
                              {canBeIdentifier && (
                                <SwitchField
                                  id={`${ids}-indexed-${index}`}
                                  label="Indexed"
                                  help={`Searchable and shown on the item card. Up to ${MAX_IDENTIFIERS} fields.`}
                                  checked={!!column.isIdentifier}
                                  onChange={(checked) =>
                                    setFieldValue(
                                      `columns[${index}].isIdentifier`,
                                      checked,
                                    )
                                  }
                                />
                              )}
                              {column.type === FILE && (
                                <TextField
                                  name={`columns[${index}].allowedFileTypes`}
                                  label="Allowed file types"
                                  placeholder="pdf doc mp3"
                                  help="File extensions separated by spaces."
                                />
                              )}
                            </FieldGrid>
                          </Stack>
                        </Surface>
                      )
                    })}
                    <div>
                      <Button
                        type="button"
                        $variant="secondary"
                        onClick={() =>
                          push({ label: '', description: '', type: 'address' })
                        }
                      >
                        Add a field
                      </Button>
                    </div>
                    {problem && <ErrorText role="alert">{problem}</ErrorText>}
                  </Stack>
                )}
              </FieldArray>
            )}
          </Stack>
        </form>
      )}

      {showPreview && (
        <Stack $gap={16}>
          {!showFields && (
            <StepHeader
              heading="Preview"
              lede="How an entry looks on its page with these fields."
            />
          )}
          <ItemDetailsCard
            title="Preview"
            columns={columns}
            itemMetaEvidence={
              isTCRofTCRs && {
                file: {
                  fileURI: tcrPrimaryDocument,
                  metadata: {
                    tcrTitle,
                    tcrDescription,
                    logoURI: tcrLogo,
                  },
                },
              }
            }
            disabled
          />
        </Stack>
      )}
    </Stack>
  )
}

export default withFormik<ItemParamsOuterProps, ItemFormValues>({
  validationSchema: itemSchema,
  mapPropsToValues: ({ tcrState }) => tcrState,
  handleSubmit: (
    { columns, isTCRofTCRs },
    { props: { postSubmit }, setStatus },
  ) => {
    const problem = isTCRofTCRs ? null : itemColumnsProblem(columns)
    if (problem) {
      toast.warning(problem)
      setStatus(problem)
      return
    }
    setStatus(undefined)
    postSubmit()
  },
})(ItemParams)
