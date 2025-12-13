import * as React from 'react';
import * as ReactDom from 'react-dom';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'AtRiskAgreementsWebPartStrings';
import { IAtRiskAgreementsProps } from './data/props';
import Strings, { setContext } from '../../strings';
import { Main } from './main';

export interface IAtRiskAgreementsWebPartProps {
  description: string;
  title: string;
}

export default class AtRiskAgreementsWebPart extends BaseClientSideWebPart<IAtRiskAgreementsWebPartProps> {

  public render(): void {

    setContext(this.context);

    const element: React.ReactElement<IAtRiskAgreementsProps> = React.createElement(
      Main,
      {
        context: this.context,
        wpTitle: this.properties.title,
      }
    );

    ReactDom.render(element, this.domElement);
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
