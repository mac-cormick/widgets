<?php
namespace Amo_smsc;

/**
 * Created by PhpStorm.
 * User: denis
 * Date: 24.02.17
 * Time: 14:53
 */
class amoapi {
	/** @var array */
	private $_methods = [
		'contacts' => '/private/api/v2/json/contacts/list',
		'notes_set' => '/private/api/v2/json/notes/set',
		'links' => '/private/api/v2/json/links/list',
		'customers' => '/private/api/v2/json/customers/list',
		'leads' => '/private/api/v2/json/leads/list',
	];

	/**
	 * @var string
	 */
	private $_protocol;

	/**
	 * @var string
	 */
	private $_subdomain;

	/**
	 * @var string
	 */
	private $_host;

	/**
	 * @var array
	 */
	private $_user;

	private $_curl = FALSE;

	/**
	 * @var string
	 */
	private $_base_url;

	/**
	 * @var string|array
	 */
	private $_response;


	/**
	 * amoapi constructor.
	 *
	 * @param $_protocol
	 * @param $_subdomain
	 * @param $_host
	 */
	public function __construct($_protocol, $_subdomain, $_host, $user) {
		$this->_protocol = $_protocol;
		$this->_subdomain = $_subdomain;
		$this->_host = $_host;
		$this->_user = $user;

		$this->_base_url = $this->_protocol . '://' . $this->_subdomain . '.' . $this->_host;
	}

	private function get_curl() {
		if (empty($this->_curl)) {
			$this->_curl = curl_init();
			curl_setopt($this->_curl, CURLOPT_SSL_VERIFYPEER, 0);
			curl_setopt($this->_curl, CURLOPT_SSL_VERIFYHOST, 0);
			curl_setopt($this->_curl, CURLOPT_CONNECTTIMEOUT, 2);
			curl_setopt($this->_curl, CURLOPT_TIMEOUT, 2);
			curl_setopt($this->_curl, CURLOPT_FOLLOWLOCATION, TRUE);
			curl_setopt($this->_curl, CURLOPT_HEADER, FALSE);
			curl_setopt($this->_curl, CURLOPT_RETURNTRANSFER, TRUE);
		}

		return $this->_curl;
	}

	/**
	 * @param string $element
	 * @param array|null $data
	 * @param bool $is_post
	 * @return bool|array
	 */
	public function send_api_request($element, $data = NULL, $is_post = FALSE) {
		if (!isset($this->_methods[$element])) {
			return FALSE;
		}
		$url = $this->_base_url . $this->_methods[$element] . '?' . http_build_query($this->_user);
		$this->get_curl();
		if ($is_post) {
			curl_setopt($this->_curl, CURLOPT_POST, TRUE);
			$response = $this->send_request($url, $data, TRUE);
		} else {
			curl_setopt($this->_curl, CURLOPT_POST, FALSE);
			if (is_array($data)) {
				// поиск по параметру ['id' => 123] или ['id' => [123, 456, 789]]
				$query = http_build_query($data);
			} else {
				// Поиск по строке
				$query = http_build_query(['query' => $data]);
			}
			$url .= '&' . $query;
			$response = $this->send_request($url);
		}

		if (!$response || empty($response['response'][$element])) {
			return FALSE;
		}

		return $response['response'][$element];
	}

	private function send_request(
		$url,
		$data = NULL,
		$json_encode = FALSE,
		$http_header = 'Content-Type: application/json'
	) {
		$this->_response = NULL;
		$curl = $this->get_curl();
		curl_setopt($curl, CURLOPT_URL, $url);

		if (!empty($data)) {
			if ($json_encode) {
				$post_fields = json_encode($data);
			} else {
				$post_fields = http_build_query($data);
			}
			curl_setopt($curl, CURLOPT_POSTFIELDS, $post_fields);
		}
		curl_setopt($curl, CURLOPT_HTTPHEADER, [$http_header]);

		$this->_response = json_decode(curl_exec($curl), TRUE);

		if (curl_errno($curl)) {
			$this->_response = 'cURL error: ' . curl_error($curl);
		}

		return $this->_response;
	}

}
