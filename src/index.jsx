import React, { Component } from 'react';
import Autocomplete from 'react-google-autocomplete';
import PropTypes from 'prop-types';
import Map from './Map';
import debounce from './../utils/debounce';

class Index extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasFormBeenEdited: false,
      lat: props.position.lat,
      lng: props.position.lng
    };
    this.props.fields.forEach((field) => {
      this.state[field.id] = ''; // eslint-disable-line react/no-direct-mutation-state
    }, this);
    this.geocode = debounce(this.geocode, 1500);
  }

  fillInAddress(place) {
    const stateCopy = Object.assign({}, this.state);
    this.props.fields.forEach((field) => {
      stateCopy[field.id] = '';
    });
    const fields = [];
    this.props.fields.forEach((field) => {
      fields[field.id] = field;
    });

    for (let i = 0; i < place.address_components.length; i += 1) {
      const addressType = place.address_components[i].types[0];
      if (fields[addressType]) {
        stateCopy[addressType] = place.address_components[i][fields[addressType].google_type];
      } else {
        Object.entries(fields).forEach(([key, value]) => {
          if (value.fallbacks && stateCopy[key] === '') {
            for (let j = 0; j < value.fallbacks.length; j += 1) {
              const fallback = value.fallbacks[j];
              if (fallback === addressType) {
                stateCopy[key] = place.address_components[i][fields[key].google_type];
                break;
              }
            }
          }
        });
      }
    }
    this.setState(stateCopy);
  }

  onChange(type, value) {
    this.setState({
      [type]: value,
      hasFormBeenEdited: true
    });
  }

  geocode(search, context) { // eslint-disable-line class-methods-use-this
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(search, (results, status) => {
      if (status === 'OK') {
        if (!context.state.hasFormBeenEdited) { // Can happen before the query resolves.
          context.fillInAddress(results[0]);
        }
      }
    });
  }

  clearForm() {
    const stateCopy = Object.assign({}, this.state);
    this.props.fields.forEach((field) => {
      stateCopy[field.id] = '';
    });
    this.setState({...stateCopy, hasFormBeenEdited: false});
  }

  handleCallback() {
    if (this.props.callback) {
      this.props.callback({
        ...this.state
      });
    }
  }

  renderInput(formType) {
    return (
      <div key={formType.name} style={{display: 'flex'}}>
        <div style={{flex: 0.6}}>
          <label>{formType.name}{formType.required && '*'}: </label>
        </div>
        <div style={{flex: 1}}>
          {!formType.autocomplete ? (
            <input
              style={formType.inputSize && { width: formType.inputSize}}
              type="input"
              name={formType.name}
              placeholder={formType.name}
              value={this.state[formType.id]}
              onChange={e => this.onChange(formType.id, e.target.value)}
            />
          ) : (
            <Autocomplete
              onPlaceSelected={(place) => {
                this.setState({
                  lng: place.geometry.location.lng(),
                  lat: place.geometry.location.lat()
                });
                this.fillInAddress(place);
              }}
              value={this.state.route}
              onChange={e => this.onChange(formType.name, e.target.value)}
              types={['address']}
            />
          )}
        </div>
      </div>
    );
  }

  render() {
    const {lng, lat} = this.state;
    return (
      <div style={{
        border: '2px solid orange',
        borderRadius: '15px',
        padding: '10px',
        background: 'repeating-linear-gradient(-45deg, #fcfdff, #fcfdff 5px, white 5px, white 10px)'
      }}>
        <div>
          {this.props.fields.map(field => this.renderInput(field))}
        </div>
        <Map
          position={{
            lng,
            lat,
            zoom: 8
          }}
          onChange={ position =>
            !this.state.hasFormBeenEdited && this.geocode({location: position}, this)
          }
        />
        <div>
          <button
            type="button"
            onClick={() => this.clearForm()}
          >
            {this.props.text.clearButton}
          </button>
          <button
            type="button"
            onClick={() => this.handleCallback()}
          >
            {this.props.text.okButton}
          </button>
        </div>
      </div>
    );
  }
}

Index.defaultProps = {
  fields: [
    {
      id: 'route',
      name: 'Street name',
      google_label: 'street_name',
      google_type: 'long_name',
      required: true,
      autocomplete: true
    }, {
      id: 'street_number',
      name: 'Street number',
      google_label: 'street_number',
      google_type: 'short_name',
      required: true,
      inputSize: '50%'
    }, {
      id: 'postal_code',
      name: 'Postcode',
      google_label: 'postcode',
      google_type: 'short_name',
      required: true,
      inputSize: '50%'
    }, {
      id: 'postal_town',
      name: 'City',
      google_label: 'city',
      google_type: 'long_name',
      fallbacks: ['locality'],
      required: true
    }, {
      id: 'country',
      name: 'Country',
      google_label: 'country',
      google_type: 'long_name',
      required: true
    }
  ],
  text: {
    clearButton: 'Clear',
    okButton: 'Ok'
  }
};

Index.propTypes = {
  position: PropTypes.shape({
    lng: PropTypes.number.isRequired,
    lat: PropTypes.number.isRequired
  }).isRequired,
  text: PropTypes.shape({
    clearButton: PropTypes.string.isRequired,
    okButton: PropTypes.string.isRequired
  }),
  fields: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    required: PropTypes.bool.isRequired,
    google_label: PropTypes.string,
    google_type: PropTypes.string,
    fallbacks: PropTypes.arrayOf(PropTypes.string)
  })),
  callback: PropTypes.func
};

export default Index;
