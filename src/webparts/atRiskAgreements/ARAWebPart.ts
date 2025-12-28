import * as React from 'react';
import * as ReactDom from 'react-dom';
import { HashRouter as Router } from "react-router-dom";
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'AtRiskAgreementsWebPartStrings';
import { IAppProps } from './data/props';
import Strings, { setContext } from '../../strings';
import { App } from './main';
import { Configuration } from './data/cfg';
import { InstallationRequired } from 'dattatable';
import { formatError } from './services/utils';

export interface IAtRiskAgreementsWebPartProps {
  description: string;
  title: string;
}

export default class AtRiskAgreementsWebPart extends BaseClientSideWebPart<IAtRiskAgreementsWebPartProps> {

  private _renderError(error: string): void {
    this.domElement.innerHTML = `
      <div class="pad">
        <h3>${Strings.ProjectName} </h3>
        <p>The solution requires setup. Please contact your administrator.</p>
        <p>Error Message: ${error}</p>
      </div>`;
  }

  private _renderApp(): void {

    const appElement: React.ReactElement<IAppProps> = React.createElement(
      App,
      {
        context: this.context,
        wpTitle: this.properties.title,
      }
    );

    // install Router on parent to use throughout
    const routerElement = React.createElement(
      Router,
      null,
      appElement
    )

    ReactDom.render(routerElement, this.domElement);
  }

  public async render(): Promise<void> {

    // set the context
    setContext(this.context);

    // set the config URL
    Configuration.setWebUrl(this.context.pageContext.web.serverRelativeUrl);

    try {
      console.log(`[${Strings.ProjectName}] Checking install...`);

      //check if install is required
      InstallationRequired.requiresInstall({ cfg: Configuration }).then(installF1 => {
        if (installF1) {
          InstallationRequired.showDialog();
        } else {
          console.log(`[${Strings.ProjectName}] Installation complete. Render web part.`);
          this._renderApp();
        }
      })
    } catch (error) {
      console.warn(`[${Strings.ProjectName}] Initialization failed.`, error);
      this._renderError(formatError(error));
    }

  }

  //Default title for first install/render
  protected async onInit(): Promise<void> {
    if (!this.properties.title) {
      this.properties.title = "At-Risk Agreements";
    }
    return super.onInit();
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: `Application version: v${Strings.Version}`
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('title', {
                  label: "Application Title"
                }),
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
