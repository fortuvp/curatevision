import React from 'react'
import styled from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames } from './kit-styles'

/* Empty state like the primitives' EmptyState: an outlined icon box, then text. */
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 24px;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  text-align: center;
`

const ImageWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  color: var(--color-faint);
`

const IconBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
`

const DescriptionText = styled.div`
  max-width: 40ch;
  color: var(--color-muted);
`

const Extra = styled.div`
  margin-top: 10px;
`

interface EmptyProps {
  description?: React.ReactNode | false
  image?: React.ReactNode | string
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface EmptyComponent extends React.FC<EmptyProps> {
  PRESENTED_IMAGE_SIMPLE: string
}

const Empty: EmptyComponent = ({
  description = 'No data',
  image,
  children,
  style,
  className,
}) => {
  const isSimple = image === Empty.PRESENTED_IMAGE_SIMPLE
  const customImage = image && !isSimple && typeof image !== 'string'

  return (
    <Wrapper
      style={style}
      className={joinClassNames(
        'ui-empty',
        isSimple && 'ui-empty-simple',
        className,
      )}
    >
      <ImageWrapper className="ui-empty-image">
        {customImage ? (
          image
        ) : isSimple ? (
          <KitIcon name="inbox" size={20} />
        ) : (
          <IconBox>
            <KitIcon name="inbox" size={18} />
          </IconBox>
        )}
      </ImageWrapper>
      {description !== false && (
        <DescriptionText className="ui-empty-description">
          {description}
        </DescriptionText>
      )}
      {children && <Extra className="ui-empty-footer">{children}</Extra>}
    </Wrapper>
  )
}

Empty.PRESENTED_IMAGE_SIMPLE = 'simple'

export default Empty
