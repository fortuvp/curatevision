import React from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { Button } from 'components/ui'
import { CurateIcon } from 'components/curate/icons'

const Page = styled.main`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px var(--horizontal-padding) 64px;
  color: var(--curate-text);
`

const Hero = styled.section`
  min-height: 420px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 22px;
  align-items: stretch;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const Surface = styled.div`
  overflow: hidden;
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius);
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.022)
    ),
    rgba(7, 11, 18, 0.9);
  box-shadow: var(--curate-shadow);
`

const HeroPanel = styled(Surface)`
  padding: clamp(24px, 4vw, 46px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    linear-gradient(130deg, rgba(7, 11, 18, 0.98), rgba(12, 26, 34, 0.92)),
    #070b12;
`

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid rgba(0, 209, 255, 0.25);
  border-radius: 999px;
  color: var(--curate-live);
  background: rgba(0, 209, 255, 0.08);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  max-width: 880px;
  margin: 20px 0 12px;
  color: var(--curate-text);
  font-size: clamp(44px, 7vw, 88px);
  line-height: 0.94;
  font-weight: 900;
  letter-spacing: 0;
`

const Copy = styled.p`
  max-width: 760px;
  margin: 0;
  color: var(--curate-muted);
  font-size: clamp(16px, 1.8vw, 19px);
  line-height: 1.68;
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
`

const PricePanel = styled(Surface)`
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const Price = styled.div`
  margin-top: 18px;
  color: var(--curate-text);
  font-size: 58px;
  line-height: 1;
  font-weight: 900;
  font-variant-numeric: tabular-nums;

  span {
    color: var(--curate-muted);
    font-size: 16px;
    font-weight: 800;
  }
`

const Grid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const Comparison = styled(Surface)`
  margin-top: 18px;
  overflow-x: auto;
`

const CompareGrid = styled.div`
  min-width: 920px;
  display: grid;
  grid-template-columns: 1.05fr repeat(3, minmax(0, 1fr));
`

const CompareCell = styled.div<{ $head?: boolean; $accent?: boolean }>`
  min-height: ${({ $head }) => ($head ? '96px' : '86px')};
  padding: 16px;
  border-right: 1px solid rgba(255, 255, 255, 0.075);
  border-bottom: 1px solid rgba(255, 255, 255, 0.075);
  background: ${({ $accent }) =>
    $accent ? 'rgba(0, 209, 255, 0.06)' : 'transparent'};

  &:nth-child(4n) {
    border-right: 0;
  }
`

const CompareTitle = styled.div`
  color: var(--curate-text);
  font-size: 15px;
  font-weight: 900;
`

const CompareMeta = styled.div`
  margin-top: 6px;
  color: var(--curate-muted);
  font-size: 13px;
  line-height: 1.45;
`

const Card = styled(Surface)`
  min-height: 250px;
  padding: 20px;
`

const IconBox = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid currentColor;
  border-radius: 13px;
  color: var(--curate-live);
  background: rgba(0, 209, 255, 0.08);
`

const CardTitle = styled.h2`
  margin: 16px 0 8px;
  color: var(--curate-text);
  font-size: 20px;
  font-weight: 900;
`

const List = styled.ul`
  display: grid;
  gap: 10px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  color: var(--curate-muted);
  font-size: 14px;
  line-height: 1.45;

  li {
    display: flex;
    gap: 9px;
  }

  li::before {
    content: '';
    width: 7px;
    height: 7px;
    margin-top: 7px;
    border-radius: 50%;
    background: var(--curate-live);
    box-shadow: 0 0 12px var(--curate-live);
    flex: 0 0 auto;
  }
`

const CuratePro = () => (
  <Page>
    <Hero>
      <HeroPanel>
        <div>
          <Eyebrow>
            <CurateIcon name="spark" size={15} />
            Curate Pro
          </Eyebrow>
          <Title>
            Launch a verification layer without rebuilding the stack.
          </Title>
          <Copy>
            Curate is open source and permissionless: anyone can create a
            registry, index it locally, host their own frontend, and build on
            the same verification rails. Curate Pro is for teams that want the
            fast path with Kleros support.
          </Copy>
        </div>
        <ActionRow>
          <Button type="primary" size="large" as={Link as any} to="/">
            Explore Curate
          </Button>
          <Button
            size="large"
            href="mailto:contact@kleros.io?subject=Curate%20Pro"
          >
            Talk to Kleros
          </Button>
        </ActionRow>
      </HeroPanel>

      <PricePanel>
        <div>
          <Eyebrow>
            <CurateIcon name="bounty" size={15} />
            Managed package
          </Eyebrow>
          <Price>
            $199 <span>/ month</span>
          </Price>
          <Copy>
            Support for teams that need a production registry experience without
            operating every piece alone.
          </Copy>
        </div>
        <List>
          <li>List creation support and parameter setup.</li>
          <li>Policy review before launch.</li>
          <li>Indexing guidance and operational support.</li>
          <li>Support creating a dedicated frontend for your registry.</li>
        </List>
      </PricePanel>
    </Hero>

    <Comparison>
      <CompareGrid>
        <CompareCell $head>
          <CompareTitle>Capability</CompareTitle>
          <CompareMeta>
            Choose how much infrastructure and support you want.
          </CompareMeta>
        </CompareCell>
        <CompareCell $head>
          <CompareTitle>Free permissionless</CompareTitle>
          <CompareMeta>$0/month, self-managed</CompareMeta>
        </CompareCell>
        <CompareCell $head $accent>
          <CompareTitle>Fast Index</CompareTitle>
          <CompareMeta>$19.99/month, API access</CompareMeta>
        </CompareCell>
        <CompareCell $head $accent>
          <CompareTitle>Curate Pro</CompareTitle>
          <CompareMeta>$199/month, full support</CompareMeta>
        </CompareCell>

        <CompareCell>
          <CompareTitle>Your own frontend</CompareTitle>
        </CompareCell>
        <CompareCell>
          <CompareMeta>
            Autonomous. You build, host, and maintain it.
          </CompareMeta>
        </CompareCell>
        <CompareCell>
          <CompareMeta>
            You build the frontend, but can give the API to an agent or
            developer to move faster.
          </CompareMeta>
        </CompareCell>
        <CompareCell>
          <CompareMeta>Full support creating a dedicated frontend.</CompareMeta>
        </CompareCell>

        <CompareCell>
          <CompareTitle>Indexing</CompareTitle>
        </CompareCell>
        <CompareCell>
          <CompareMeta>
            Locally index the graph yourself or use a third-party indexer.
          </CompareMeta>
        </CompareCell>
        <CompareCell>
          <CompareMeta>Super fast indexing with an API provided.</CompareMeta>
        </CompareCell>
        <CompareCell>
          <CompareMeta>
            API provided for fast indexing, plus operational support.
          </CompareMeta>
        </CompareCell>

        <CompareCell>
          <CompareTitle>Policy</CompareTitle>
        </CompareCell>
        <CompareCell>
          <CompareMeta>
            You are fully in control and write your own policy.
          </CompareMeta>
        </CompareCell>
        <CompareCell>
          <CompareMeta>No policy support included.</CompareMeta>
        </CompareCell>
        <CompareCell>
          <CompareMeta>We assist with policy creation and review.</CompareMeta>
        </CompareCell>
      </CompareGrid>
    </Comparison>

    <Grid>
      <Card>
        <IconBox>
          <CurateIcon name="factory" size={20} />
        </IconBox>
        <CardTitle>Permissionless by default</CardTitle>
        <Copy>
          Create your own registry directly on Curate. The contracts and
          frontend are open source, so teams can self-host, modify, and operate
          their own verification experience.
        </Copy>
      </Card>
      <Card>
        <IconBox>
          <CurateIcon name="chain" size={20} />
        </IconBox>
        <CardTitle>Bring your own infrastructure</CardTitle>
        <Copy>
          Self-managed teams cover hosting, local indexing, monitoring, and any
          dedicated frontend work. That path stays open for builders who want
          full control.
        </Copy>
      </Card>
      <Card>
        <IconBox>
          <CurateIcon name="policy" size={20} />
        </IconBox>
        <CardTitle>Or get direct support</CardTitle>
        <Copy>
          Curate Pro packages Kleros support around list design, policy quality,
          indexing, and frontend delivery so teams can launch faster and keep
          their registry usable.
        </Copy>
      </Card>
    </Grid>
  </Page>
)

export default CuratePro
