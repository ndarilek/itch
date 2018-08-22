import { messages } from "common/butlerd";
import {
  Game,
  InstallLocationSummary,
  InstallPlanInfo,
  Upload,
} from "common/butlerd/messages";
import { fileSize } from "common/format/filesize";
import { formatUploadTitle } from "common/format/upload";
import { ModalWidgetProps } from "common/modals";
import { PlanInstallParams, PlanInstallResponse } from "common/modals/types";
import { Dispatch } from "common/types";
import React from "react";
import Button from "renderer/basics/Button";
import Filler from "renderer/basics/Filler";
import Icon from "renderer/basics/Icon";
import LoadingCircle from "renderer/basics/LoadingCircle";
import { ModalButtons } from "renderer/basics/modal-styles";
import { rcall } from "renderer/butlerd/rcall";
import { doAsync } from "renderer/helpers/doAsync";
import { hook } from "renderer/hocs/hook";
import { ModalWidgetDiv } from "renderer/modal-widgets/styles";
import { FilterSpacer } from "renderer/pages/common/SortsAndFilters";
import StandardGameDesc from "renderer/pages/common/StandardGameDesc";
import { Box, BoxInner } from "renderer/pages/PageStyles/boxes";
import { StandardGameCover } from "renderer/pages/PageStyles/games";
import styled from "renderer/styles";
import { findWhere } from "underscore";

const SizeTable = styled.table`
  width: 100%;
  font-size: ${props => props.theme.fontSizes.huge};

  td {
    line-height: 1.8;
    padding: 0.1em 0.4em;

    strong {
      font-weight: bold;
    }

    i {
      font-size: 80%;
      opacity: 0.6;
    }
  }

  td:first-child {
    text-align: right;
  }
`;

const PlanInstallDiv = styled(ModalWidgetDiv)`
  min-width: 800px;
  max-width: 800px;
  min-height: 500px;
  max-height: 500px;
  display: flex;
  flex-direction: column;

  font-size: ${props => props.theme.fontSizes.larger};
`;

const Select = styled.select`
  margin: 0.5em auto;
  width: 500px;
  padding: 0.4em;
  border: 2px solid ${props => props.theme.filterBorder};
  color: ${props => props.theme.baseText};

  background: rgba(0, 0, 0, 0.1);
  font-size: ${props => props.theme.fontSizes.larger};
`;

enum PlanStage {
  Initializing,
  Planning,
  Failed,
}

class PlanInstall extends React.PureComponent<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    const { gameId } = props.modal.widgetParams;
    this.state = {
      stage: PlanStage.Initializing,
      busy: true,
      gameId,
    };
  }

  render() {
    return <PlanInstallDiv>{this.renderBody()}</PlanInstallDiv>;
  }

  renderBody() {
    const { stage } = this.state;
    switch (stage) {
      case PlanStage.Initializing:
        return this.renderInitializing();
      case PlanStage.Planning:
        return this.renderPlanning();
      case PlanStage.Failed:
        return this.renderFailed();
    }
  }

  renderInitializing() {
    return <LoadingCircle wide progress={-1} />;
  }

  renderPlanning() {
    const {
      game,
      uploads,
      pickedUpload,
      info,
      installLocations,
      installLocation,
    } = this.state;
    return (
      <>
        <Box>
          <BoxInner>
            <StandardGameCover game={game} />
            <FilterSpacer />
            <StandardGameDesc game={game} />
          </BoxInner>
        </Box>
        <Select>
          {installLocations.map(il => (
            <option key={il.id} selected={il.id === installLocation.id}>
              {il.path} ({fileSize(il.sizeInfo.freeSize)} free)
            </option>
          ))}
        </Select>
        <Select>
          {uploads.map(u => (
            <option key={u.id} selected={u.id === pickedUpload.id}>
              {formatUploadTitle(u)} ({fileSize(u.size)})
            </option>
          ))}
        </Select>
        <Filler />
        {info ? (
          <>
            <SizeTable>
              <tr>
                <td>Space needed</td>
                <td>
                  <Icon icon="download" />{" "}
                  <strong>{fileSize(info.diskUsage.neededFreeSpace)}</strong>{" "}
                  <i>{info.diskUsage.accuracy}</i>
                </td>
              </tr>
              <tr>
                <td>Available</td>
                <td>
                  <Icon icon="folder-open" />{" "}
                  <strong>{fileSize(762 * 1024 * 1024)}</strong>
                </td>
              </tr>
            </SizeTable>
          </>
        ) : null}
        <Filler />
        <ModalButtons>
          <Button>Install now</Button>
        </ModalButtons>
      </>
    );
    return "You may plan now.";
  }

  renderFailed() {
    const { error } = this.state;
    return `Something went wrong: ${error}`;
  }

  componentDidMount() {
    this.pickUpload(0);
  }

  pickUpload(uploadId: number) {
    doAsync(async () => {
      try {
        const { defaultInstallLocation } = this.props;
        const { installLocations } = await rcall(
          messages.InstallLocationsList,
          {}
        );
        const installLocation = findWhere(installLocations, {
          id: defaultInstallLocation,
        });
        this.setState({
          installLocations,
          installLocation,
        });

        const { gameId } = this.state;
        const res = await rcall(messages.InstallPlan, { gameId, uploadId });
        this.setState({
          stage: PlanStage.Planning,
          game: res.game,
          uploads: res.uploads,
          pickedUpload: res.info ? res.info.upload : null,
          info: res.info,
        });
      } catch (e) {
        this.setState({
          stage: PlanStage.Failed,
          error: e,
        });
      }
    });
  }
}

interface Props
  extends ModalWidgetProps<PlanInstallParams, PlanInstallResponse> {
  defaultInstallLocation: string;
  dispatch: Dispatch;
}

interface State {
  stage: PlanStage;
  busy: boolean;
  gameId: number;
  game?: Game;
  pickedUpload?: Upload;
  uploads?: Upload[];
  info?: InstallPlanInfo;
  error?: Error;

  installLocations?: InstallLocationSummary[];
  installLocation?: InstallLocationSummary;
}

export default hook(map => ({
  defaultInstallLocation: map(rs => rs.preferences.defaultInstallLocation),
}))(PlanInstall);
