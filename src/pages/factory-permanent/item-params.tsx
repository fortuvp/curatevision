import React, { useEffect } from 'react'
import {
  FieldArray,
  withFormik,
  type FormikErrors,
  type FormikProps,
  type FormikTouched,
} from 'formik'
import * as yup from 'yup'
import { toast } from 'react-toastify'
import { ItemTypes as AllItemTypes } from '@kleros/gtcr-encoder'
import objectWithoutKey from 'utils/object-without-key'
import ItemDetailsCard from 'components/item-details-card'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  IconButton,
  Label,
  Row,
  Small,
  Stack,
  Subheading,
  Surface,
} from 'components/curate/primitives'
import {
  Field,
  FieldGrid,
  FormSection,
  Input,
  SectionHead,
  Select,
  SwitchInput,
  SwitchRow,
  SwitchText,
} from './controls'
import { NEW_COLUMN } from './defaults'
import type { StepProps, TcrState } from '.'

/*
 * Step 2 of the Stake Curate factory: the fields every entry has. One
 * surface per field (name, description, type, identifier switch, allowed
 * file types, remove), which stacks cleanly at phone width, then a preview
 * of the submission form the list will show.
 */

export const ItemTypes = objectWithoutKey(AllItemTypes, 'TWITTER_USER_ID')

const { IMAGE, FILE, LONG_TEXT } = AllItemTypes

const MAX_IDENTIFIERS = 5

type ItemFormValues = TcrState
type ItemParamsProps = StepProps & FormikProps<ItemFormValues>

const ItemParams = ({
  handleSubmit,
  setFieldValue,
  getFieldProps,
  formId,
  values: { columns },
  errors,
  touched,
  setTcrState,
}: ItemParamsProps) => {
  useEffect(() => {
    setTcrState((previousState) => ({
      ...previousState,
      columns,
    }))
  }, [columns, setTcrState])

  const columnError = (index: number, key: keyof Column) => {
    const cols = errors.columns
    if (!Array.isArray(cols)) return undefined
    const entry = cols[index]
    return entry && typeof entry === 'object'
      ? ((entry as FormikErrors<Column>)[key] as string | undefined)
      : undefined
  }

  const columnTouched = (index: number, key: keyof Column): boolean => {
    const cols = touched.columns
    if (!Array.isArray(cols)) return false
    const entry = cols[index] as FormikTouched<Column> | undefined
    return !!entry?.[key]
  }

  const shownError = (index: number, key: keyof Column) =>
    columnTouched(index, key) ? columnError(index, key) : undefined

  const onTypeChange = (index: number, value: string) => {
    setFieldValue(`columns[${index}].type`, value)
    // Long text and image fields cannot be identifiers.
    if (value === LONG_TEXT || value === IMAGE)
      setFieldValue(`columns[${index}].isIdentifier`, false)
  }

  const identifierCount = columns.filter(
    (column) => !!column.isIdentifier,
  ).length

  return (
    <Stack $gap={24}>
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <Stack $gap={16}>
          <FormSection>
            <SectionHead>
              <Label>Step 2 of 3</Label>
              <Subheading>Item fields</Subheading>
              <Body $muted>
                Entries show their fields in this order, so put the image or
                the title first. Identifier fields are searchable and appear on
                the entry card; at least one is required, up to{' '}
                {MAX_IDENTIFIERS}.
              </Body>
            </SectionHead>
          </FormSection>
          <FieldArray name="columns">
            {({ push, remove }) => (
              <>
                {columns.map((column, index) => {
                  const canBeIdentifier =
                    (identifierCount < MAX_IDENTIFIERS ||
                      !!column.isIdentifier) &&
                    column.type !== LONG_TEXT &&
                    column.type !== IMAGE &&
                    column.type !== FILE
                  const base = `column-${index}`
                  return (
                    <Surface key={index} $padding="compact">
                      <Stack $gap={14}>
                        <Row $justify="space-between" $gap={12}>
                          <Label>Field {index + 1}</Label>
                          {columns.length > 1 && (
                            <IconButton
                              type="button"
                              aria-label={`Remove field ${index + 1}`}
                              onClick={() => remove(index)}
                            >
                              <CurateIcon name="close" size={16} />
                            </IconButton>
                          )}
                        </Row>
                        <FieldGrid>
                          <Field
                            id={`${base}-label`}
                            label={`Field ${index + 1} name`}
                            help="Shown as the field label when someone submits an item."
                            error={shownError(index, 'label')}
                          >
                            {(aria) => (
                              <Input
                                {...aria}
                                type="text"
                                {...getFieldProps(`columns[${index}].label`)}
                              />
                            )}
                          </Field>
                          <Field
                            id={`${base}-description`}
                            label={`Field ${index + 1} description`}
                            help="Shown next to the field as help text."
                            error={shownError(index, 'description')}
                          >
                            {(aria) => (
                              <Input
                                {...aria}
                                type="text"
                                {...getFieldProps(
                                  `columns[${index}].description`,
                                )}
                              />
                            )}
                          </Field>
                          <Field
                            id={`${base}-type`}
                            label={`Field ${index + 1} type`}
                          >
                            {(aria) => (
                              <Select
                                {...aria}
                                value={column.type}
                                onChange={(event) =>
                                  onTypeChange(index, event.target.value)
                                }
                              >
                                {Object.values(ItemTypes).map((itemType) => (
                                  <option
                                    value={String(itemType)}
                                    key={String(itemType)}
                                  >
                                    {String(itemType)}
                                  </option>
                                ))}
                              </Select>
                            )}
                          </Field>
                          {canBeIdentifier && (
                            <SwitchRow htmlFor={`${base}-identifier`}>
                              <SwitchText>
                                Identifier
                                <Small $muted>
                                  Searchable and shown on the entry card.
                                </Small>
                              </SwitchText>
                              <SwitchInput
                                id={`${base}-identifier`}
                                type="checkbox"
                                role="switch"
                                checked={!!column.isIdentifier}
                                onChange={(event) =>
                                  setFieldValue(
                                    `columns[${index}].isIdentifier`,
                                    event.target.checked,
                                  )
                                }
                              />
                            </SwitchRow>
                          )}
                          {column.type === FILE && (
                            <Field
                              id={`${base}-file-types`}
                              label="Allowed file types"
                              help="Extensions separated by spaces, for example: pdf doc mp3."
                              error={shownError(index, 'allowedFileTypes')}
                            >
                              {(aria) => (
                                <Input
                                  {...aria}
                                  type="text"
                                  {...getFieldProps(
                                    `columns[${index}].allowedFileTypes`,
                                  )}
                                />
                              )}
                            </Field>
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
                    onClick={() => push({ ...NEW_COLUMN })}
                  >
                    Add field
                  </Button>
                </div>
              </>
            )}
          </FieldArray>
        </Stack>
      </form>
      <ItemDetailsCard title="Preview" columns={columns} />
    </Stack>
  )
}

const validationSchema = yup.object().shape({
  columns: yup.array().of(
    yup.object().shape({
      label: yup.string().required('The column label is required.'),
      description: yup.string().required('The column description is required.'),
      allowedFileTypes: yup.string().when('type', {
        is: FILE,
        then: (schema) =>
          schema.required('At least one file type is required.'),
      }),
    }),
  ),
})

export default withFormik<StepProps, ItemFormValues>({
  validationSchema,
  mapPropsToValues: ({ tcrState }) => tcrState,
  handleSubmit: ({ columns }, { props: { postSubmit } }) => {
    if (!columns.some((c) => c.isIdentifier)) {
      toast.warning('At least one identifier field is required.')
      return
    }
    const usedLabels = new Set()
    for (const col of columns) {
      if (usedLabels.has(col.label)) {
        toast.warning('Field names must be unique.')
        return
      }
      usedLabels.add(col.label)
    }
    postSubmit()
  },
})(ItemParams)
